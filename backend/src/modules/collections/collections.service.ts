import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DefaultCase, DefaultStageHistoryEntry } from './default-case.entity';
import { LoansService } from '../loans/loans.service';
import { UsersService } from '../users/users.service';
import { DefaultStage, ScheduleItemStatus, SmsTemplate } from '../../common/enums';
import { SMS_GATEWAY_PORT, SmsGatewayPort } from '../../integrations/interfaces/sms-gateway.port';
import { LEGAL_RULES } from '../../config/legal-rules.config';
import { Loan } from '../loans/loan.entity';

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger('Collections');

  constructor(
    @InjectRepository(DefaultCase) private readonly repo: Repository<DefaultCase>,
    private readonly loansService: LoansService,
    private readonly usersService: UsersService,
    @Inject(SMS_GATEWAY_PORT) private readonly smsGateway: SmsGatewayPort,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async runDailyCycle(): Promise<{ accrued: number; casesOpened: number; casesAdvanced: number; casesClosed: number }> {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const items = await this.loansService.findOpenScheduleItems();
    const loanCache = new Map<string, Loan>();
    let accrued = 0;

    for (const item of items) {
      if (item.status === ScheduleItemStatus.PAID) continue;
      const isPastDue = new Date(item.dueDate).getTime() < today.getTime();
      if (!isPastDue) continue;

      let loan = loanCache.get(item.loanId);
      if (!loan) {
        loan = await this.loansService.findByIdOrThrow(item.loanId);
        loanCache.set(item.loanId, loan);
      }
      await this.loansService.accrueDailyPenalty(item, loan);
      accrued += 1;
    }

    // Перечитываем займы после начисления пени (статусы могли обновиться).
    const allLoans = await this.loansService.listAll();
    const openSchedulesByLoan = new Map<string, typeof items>();
    for (const item of await this.loansService.findOpenScheduleItems()) {
      const arr = openSchedulesByLoan.get(item.loanId) ?? [];
      arr.push(item);
      openSchedulesByLoan.set(item.loanId, arr);
    }

    let casesOpened = 0;
    let casesAdvanced = 0;
    let casesClosed = 0;

    for (const loan of allLoans) {
      const loanItems = openSchedulesByLoan.get(loan.id) ?? [];
      const overdueItems = loanItems.filter((i) => i.status === ScheduleItemStatus.OVERDUE);
      const maxDaysOverdue = overdueItems.reduce((max, i) => Math.max(max, i.daysOverdue), 0);

      let defaultCase = await this.repo.findOne({ where: { loanId: loan.id } });

      if (maxDaysOverdue <= 0) {
        if (defaultCase && defaultCase.stage !== DefaultStage.CLOSED) {
          defaultCase.stage = DefaultStage.CLOSED;
          defaultCase.closedAt = new Date();
          defaultCase.stageHistory = [
            ...defaultCase.stageHistory,
            { stage: DefaultStage.CLOSED, at: today.toISOString(), daysOverdue: 0 },
          ];
          await this.repo.save(defaultCase);
          casesClosed += 1;
        }
        continue;
      }

      const borrower = await this.usersService.findByIdOrThrow(loan.borrowerId);

      if (!defaultCase) {
        defaultCase = this.repo.create({
          loanId: loan.id,
          borrowerId: loan.borrowerId,
          stage: DefaultStage.SOFT_REMINDERS,
          maxDaysOverdue,
          openedAt: today,
          stageHistory: [{ stage: DefaultStage.SOFT_REMINDERS, at: today.toISOString(), daysOverdue: maxDaysOverdue }],
        });
        defaultCase = await this.repo.save(defaultCase);
        casesOpened += 1;
      }

      defaultCase.maxDaysOverdue = Math.max(defaultCase.maxDaysOverdue, maxDaysOverdue);

      const targetStage = this.resolveStage(maxDaysOverdue);
      if (this.stageRank(targetStage) > this.stageRank(defaultCase.stage)) {
        defaultCase.stage = targetStage;
        defaultCase.stageHistory = [
          ...defaultCase.stageHistory,
          { stage: targetStage, at: today.toISOString(), daysOverdue: maxDaysOverdue } as DefaultStageHistoryEntry,
        ];
        casesAdvanced += 1;

        if (targetStage === DefaultStage.PRE_CLAIM && !defaultCase.preClaimNoticeText) {
          defaultCase.preClaimNoticeText = this.buildPreClaimText(loan, maxDaysOverdue);
          await this.smsGateway.send(
            borrower.phone,
            SmsTemplate.PRE_CLAIM_NOTICE,
            `SOS: Досудебная претензия по займу №${loan.id.slice(0, 8)}. Просрочка ${maxDaysOverdue} дн. Погасите задолженность, иначе дело будет передано на взыскание.`,
            { loanId: loan.id },
          );
        }
        if (targetStage === DefaultStage.LEGAL_ACTION && !defaultCase.legalActionNoticeText) {
          defaultCase.legalActionNoticeText = this.buildLegalActionText(loan, maxDaysOverdue);
          await this.loansService.markDefault(loan.id);
          await this.smsGateway.send(
            borrower.phone,
            SmsTemplate.LEGAL_ACTION_NOTICE,
            `SOS: Задолженность по займу №${loan.id.slice(0, 8)} передана на взыскание (просрочка ${maxDaysOverdue} дн.). Сведения переданы в БКИ.`,
            { loanId: loan.id },
          );
        }
      }

      if (
        LEGAL_RULES.COLLECTIONS.SOFT_REMINDER_DAYS_AFTER_DUE.includes(maxDaysOverdue) &&
        defaultCase.lastSoftReminderSentOn !== todayStr
      ) {
        await this.smsGateway.send(
          borrower.phone,
          SmsTemplate.PAYMENT_OVERDUE,
          `SOS: У вас просроченный платёж по займу (${maxDaysOverdue} дн.). Пожалуйста, погасите задолженность как можно скорее, чтобы избежать роста пени.`,
          { loanId: loan.id },
        );
        defaultCase.lastSoftReminderSentOn = todayStr;
      }

      await this.repo.save(defaultCase);
    }

    this.logger.log(
      `Ежедневный цикл взыскания: начислений пени ${accrued}, открыто дел ${casesOpened}, продвинуто ${casesAdvanced}, закрыто ${casesClosed}`,
    );
    return { accrued, casesOpened, casesAdvanced, casesClosed };
  }

  private resolveStage(daysOverdue: number): DefaultStage {
    if (daysOverdue >= LEGAL_RULES.COLLECTIONS.LEGAL_ACTION_DAY_AFTER_DUE) return DefaultStage.LEGAL_ACTION;
    if (daysOverdue >= LEGAL_RULES.COLLECTIONS.PRE_CLAIM_DAY_AFTER_DUE) return DefaultStage.PRE_CLAIM;
    return DefaultStage.SOFT_REMINDERS;
  }

  private stageRank(stage: DefaultStage): number {
    return { NONE: 0, SOFT_REMINDERS: 1, PRE_CLAIM: 2, LEGAL_ACTION: 3, CLOSED: 4 }[stage];
  }

  private buildPreClaimText(loan: Loan, daysOverdue: number): string {
    return [
      'ДОСУДЕБНАЯ ПРЕТЕНЗИЯ',
      `Заём №${loan.id}`,
      `Настоящим уведомляем о просроченной задолженности по договору займа сроком ${daysOverdue} дней.`,
      `Остаток основного долга: ${loan.outstandingPrincipalByn} BYN. Начисленная пеня: ${loan.accruedPenaltyByn} BYN.`,
      'Требуем погасить задолженность в течение 30 календарных дней с момента направления настоящей претензии.',
      'В случае неисполнения требования задолженность будет передана на взыскание в порядке, предусмотренном договором займа и законодательством Республики Беларусь.',
      '(Документ сформирован автоматически, демонстрационный шаблон)',
    ].join('\n');
  }

  private buildLegalActionText(loan: Loan, daysOverdue: number): string {
    return [
      'УВЕДОМЛЕНИЕ О ПЕРЕДАЧЕ ЗАДОЛЖЕННОСТИ НА ВЗЫСКАНИЕ',
      `Заём №${loan.id}`,
      `Просрочка составляет ${daysOverdue} дней. Досудебная претензия оставлена без удовлетворения.`,
      `Остаток основного долга: ${loan.outstandingPrincipalByn} BYN. Начисленная пеня: ${loan.accruedPenaltyByn} BYN.`,
      'Информация о задолженности передаётся в бюро кредитных историй. Взыскание задолженности будет производиться в судебном порядке / через передачу третьему лицу, осуществляющему взыскание, в соответствии с договором займа и законодательством Республики Беларусь.',
      '(Документ сформирован автоматически, демонстрационный шаблон)',
    ].join('\n');
  }

  async findByLoan(loanId: string): Promise<DefaultCase | null> {
    return this.repo.findOne({ where: { loanId } });
  }

  listAll(): Promise<DefaultCase[]> {
    return this.repo.find({ order: { openedAt: 'DESC' } });
  }

  listOpen(): Promise<DefaultCase[]> {
    return this.repo
      .createQueryBuilder('c')
      .where('c.stage != :closed', { closed: DefaultStage.CLOSED })
      .orderBy('c.maxDaysOverdue', 'DESC')
      .getMany();
  }
}
