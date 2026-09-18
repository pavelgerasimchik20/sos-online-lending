import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './loan.entity';
import { LoanLenderShare } from './loan-lender-share.entity';
import { PaymentScheduleItem } from './payment-schedule-item.entity';
import { LoanApplication } from '../loan-applications/loan-application.entity';
import { LoanStatus, ScheduleItemStatus } from '../../common/enums';
import { buildAnnuitySchedule, fullCostOfCreditPercent, round2 } from '../../common/loan-math';
import { LEGAL_RULES } from '../../config/legal-rules.config';

export interface CommitmentForIssuance {
  lenderId: string;
  amountByn: number;
}

export interface PaymentAllocation {
  interestPaidByn: number;
  principalPaidByn: number;
  penaltyPaidByn: number;
  perLender: Map<string, { principal: number; interest: number; penalty: number }>;
}

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan) private readonly loanRepo: Repository<Loan>,
    @InjectRepository(LoanLenderShare) private readonly shareRepo: Repository<LoanLenderShare>,
    @InjectRepository(PaymentScheduleItem) private readonly scheduleRepo: Repository<PaymentScheduleItem>,
  ) {}

  async issue(application: LoanApplication, commitments: CommitmentForIssuance[]): Promise<Loan> {
    const principal = Number(application.approvedAmountByn);
    const rate = Number(application.annualRatePercent);
    const term = Number(application.approvedTermMonths);
    const issuedAt = new Date();

    const scheduleRows = buildAnnuitySchedule(principal, rate, term, issuedAt);
    const totalPayable = round2(scheduleRows.reduce((sum, row) => sum + row.totalDue, 0));

    let loan = this.loanRepo.create({
      applicationId: application.id,
      borrowerId: application.borrowerId,
      principalByn: principal,
      annualRatePercent: rate,
      termMonths: term,
      status: LoanStatus.ACTIVE,
      issuedAt,
      outstandingPrincipalByn: principal,
      accruedPenaltyByn: 0,
      fullCostOfCreditPercent: fullCostOfCreditPercent(principal, totalPayable, term),
    });
    loan = await this.loanRepo.save(loan);

    const scheduleEntities = scheduleRows.map((row) =>
      this.scheduleRepo.create({
        loanId: loan.id,
        installmentNo: row.installmentNo,
        dueDate: row.dueDate.toISOString().slice(0, 10),
        principalDueByn: row.principalDue,
        interestDueByn: row.interestDue,
        totalDueByn: row.totalDue,
        status: ScheduleItemStatus.PENDING,
      }),
    );
    await this.scheduleRepo.save(scheduleEntities);

    const totalCommitted = commitments.reduce((sum, c) => sum + c.amountByn, 0);
    const shares = commitments.map((c) =>
      this.shareRepo.create({
        loanId: loan.id,
        lenderId: c.lenderId,
        principalShareByn: round2(c.amountByn),
        shareRatio: totalCommitted > 0 ? c.amountByn / totalCommitted : 0,
      }),
    );
    await this.shareRepo.save(shares);

    return loan;
  }

  async findByIdOrThrow(id: string): Promise<Loan> {
    const loan = await this.loanRepo.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException('Заём не найден');
    }
    return loan;
  }

  listForBorrower(borrowerId: string): Promise<Loan[]> {
    return this.loanRepo.find({ where: { borrowerId }, order: { issuedAt: 'DESC' } });
  }

  listAll(): Promise<Loan[]> {
    return this.loanRepo.find({ order: { issuedAt: 'DESC' } });
  }

  listSchedule(loanId: string): Promise<PaymentScheduleItem[]> {
    return this.scheduleRepo.find({ where: { loanId }, order: { installmentNo: 'ASC' } });
  }

  listShares(loanId: string): Promise<LoanLenderShare[]> {
    return this.shareRepo.find({ where: { loanId } });
  }

  listSharesForLender(lenderId: string): Promise<LoanLenderShare[]> {
    return this.shareRepo.find({ where: { lenderId }, order: { createdAt: 'DESC' } });
  }

  async recordLenderReceipt(
    loanId: string,
    lenderId: string,
    principalByn: number,
    interestByn: number,
  ): Promise<void> {
    const share = await this.shareRepo.findOne({ where: { loanId, lenderId } });
    if (!share) return;
    share.receivedPrincipalByn = round2(Number(share.receivedPrincipalByn) + principalByn);
    share.receivedInterestByn = round2(Number(share.receivedInterestByn) + interestByn);
    await this.shareRepo.save(share);
  }

  saveLoan(loan: Loan): Promise<Loan> {
    return this.loanRepo.save(loan);
  }

  saveShares(shares: LoanLenderShare[]): Promise<LoanLenderShare[]> {
    return this.shareRepo.save(shares);
  }

  /** Все элементы графика по активным займам, не оплаченные полностью (для cron-обработки просрочек/напоминаний). */
  findOpenScheduleItems(): Promise<PaymentScheduleItem[]> {
    return this.scheduleRepo.find({
      where: [{ status: ScheduleItemStatus.PENDING }, { status: ScheduleItemStatus.OVERDUE }, { status: ScheduleItemStatus.PARTIALLY_PAID }],
      order: { dueDate: 'ASC' },
    });
  }

  saveScheduleItem(item: PaymentScheduleItem): Promise<PaymentScheduleItem> {
    return this.scheduleRepo.save(item);
  }

  saveScheduleItems(items: PaymentScheduleItem[]): Promise<PaymentScheduleItem[]> {
    return this.scheduleRepo.save(items);
  }

  private isItemSettled(item: PaymentScheduleItem): boolean {
    return (
      Number(item.interestPaidByn) >= Number(item.interestDueByn) - 0.005 &&
      Number(item.principalPaidByn) >= Number(item.principalDueByn) - 0.005
    );
  }

  /**
   * Распределяет поступивший платёж по графику: проценты -> тело -> пеня
   * в последнюю очередь (защита прав потребителя), в хронологическом
   * порядке начиная с самого раннего неоплаченного платежа.
   */
  async allocatePayment(loanId: string, amountByn: number): Promise<PaymentAllocation> {
    const loan = await this.findByIdOrThrow(loanId);
    const items = (await this.listSchedule(loanId)).filter((i) => i.status !== ScheduleItemStatus.PAID);

    let remaining = round2(amountByn);
    const perLender = new Map<string, { principal: number; interest: number; penalty: number }>();
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;
    let totalPenaltyPaid = 0;

    const shares = await this.listShares(loanId);

    const applyToLenders = (kind: 'principal' | 'interest' | 'penalty', amount: number) => {
      if (amount <= 0) return;
      for (const share of shares) {
        const portion = round2(amount * Number(share.shareRatio));
        const entry = perLender.get(share.lenderId) ?? { principal: 0, interest: 0, penalty: 0 };
        entry[kind] += portion;
        perLender.set(share.lenderId, entry);
      }
    };

    // Проход 1: проценты -> тело
    for (const item of items) {
      if (remaining <= 0) break;
      const interestOwed = round2(Number(item.interestDueByn) - Number(item.interestPaidByn));
      if (interestOwed > 0) {
        const pay = Math.min(remaining, interestOwed);
        item.interestPaidByn = round2(Number(item.interestPaidByn) + pay);
        remaining = round2(remaining - pay);
        totalInterestPaid = round2(totalInterestPaid + pay);
        applyToLenders('interest', pay);
      }
      if (remaining <= 0) {
        await this.scheduleRepo.save(item);
        continue;
      }
      const principalOwed = round2(Number(item.principalDueByn) - Number(item.principalPaidByn));
      if (principalOwed > 0) {
        const pay = Math.min(remaining, principalOwed);
        item.principalPaidByn = round2(Number(item.principalPaidByn) + pay);
        remaining = round2(remaining - pay);
        totalPrincipalPaid = round2(totalPrincipalPaid + pay);
        applyToLenders('principal', pay);
      }
      await this.scheduleRepo.save(item);
    }

    // Проход 2: пеня — в последнюю очередь
    for (const item of items) {
      if (remaining <= 0) break;
      const penaltyOwed = round2(Number(item.penaltyDueByn) - Number(item.penaltyPaidByn));
      if (penaltyOwed > 0) {
        const pay = Math.min(remaining, penaltyOwed);
        item.penaltyPaidByn = round2(Number(item.penaltyPaidByn) + pay);
        remaining = round2(remaining - pay);
        totalPenaltyPaid = round2(totalPenaltyPaid + pay);
        applyToLenders('penalty', pay);
        await this.scheduleRepo.save(item);
      }
    }

    // Обновление статусов и агрегатов
    const refreshedItems = await this.listSchedule(loanId);
    for (const item of refreshedItems) {
      if (this.isItemSettled(item)) {
        item.status = ScheduleItemStatus.PAID;
        item.paidAt = item.paidAt ?? new Date();
      } else if (Number(item.interestPaidByn) > 0 || Number(item.principalPaidByn) > 0) {
        item.status = new Date(item.dueDate) < new Date() ? ScheduleItemStatus.OVERDUE : ScheduleItemStatus.PARTIALLY_PAID;
      }
    }
    await this.scheduleRepo.save(refreshedItems);

    loan.outstandingPrincipalByn = round2(Number(loan.outstandingPrincipalByn) - totalPrincipalPaid);
    loan.accruedPenaltyByn = round2(Math.max(0, Number(loan.accruedPenaltyByn) - totalPenaltyPaid));

    const allSettled = refreshedItems.every((i) => i.status === ScheduleItemStatus.PAID);
    const remainingPenalty = round2(
      refreshedItems.reduce((sum, i) => sum + Number(i.penaltyDueByn) - Number(i.penaltyPaidByn), 0),
    );
    if (allSettled && remainingPenalty <= 0) {
      const lastDueDate = refreshedItems.reduce(
        (latest, i) => (new Date(i.dueDate) > latest ? new Date(i.dueDate) : latest),
        new Date(0),
      );
      loan.status = new Date() < lastDueDate ? LoanStatus.EARLY_REPAID : LoanStatus.CLOSED;
      loan.closedAt = new Date();
    } else if (refreshedItems.some((i) => i.status === ScheduleItemStatus.OVERDUE)) {
      loan.status = LoanStatus.OVERDUE;
    } else {
      loan.status = LoanStatus.ACTIVE;
    }
    await this.loanRepo.save(loan);

    return {
      interestPaidByn: totalInterestPaid,
      principalPaidByn: totalPrincipalPaid,
      penaltyPaidByn: totalPenaltyPaid,
      perLender,
    };
  }

  /** Начисление пени за текущий день по просроченным платежам (вызывается из CollectionsModule). */
  async accrueDailyPenalty(item: PaymentScheduleItem, loan: Loan): Promise<void> {
    const today = new Date();
    const lastAccrual = item.lastPenaltyAccrualAt ? new Date(item.lastPenaltyAccrualAt) : new Date(item.dueDate);
    const daysSinceAccrual = Math.floor((today.getTime() - lastAccrual.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceAccrual <= 0) {
      return;
    }
    const owedBase = round2(
      Number(item.principalDueByn) -
        Number(item.principalPaidByn) +
        (Number(item.interestDueByn) - Number(item.interestPaidByn)),
    );
    if (owedBase <= 0) {
      return;
    }
    const dailyRate = LEGAL_RULES.PENALTY.DEFAULT_DAILY_PERCENT / 100;
    let newPenalty = round2(owedBase * dailyRate * daysSinceAccrual);

    // Потолок: проценты + пеня по займу в целом не более multiplier * принципал.
    const cap = round2(Number(loan.principalByn) * LEGAL_RULES.PENALTY.MAX_TOTAL_OVERPAYMENT_MULTIPLIER);
    const currentTotalOverpayment = round2(Number(loan.accruedPenaltyByn) + this.estimateAccruedInterestForLoan(loan));
    if (currentTotalOverpayment + newPenalty > cap) {
      newPenalty = Math.max(0, round2(cap - currentTotalOverpayment));
    }

    item.penaltyDueByn = round2(Number(item.penaltyDueByn) + newPenalty);
    item.lastPenaltyAccrualAt = today;
    const daysOverdue = Math.floor((today.getTime() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    item.daysOverdue = Math.max(0, daysOverdue);
    item.status = ScheduleItemStatus.OVERDUE;
    await this.scheduleRepo.save(item);

    loan.accruedPenaltyByn = round2(Number(loan.accruedPenaltyByn) + newPenalty);
    if (loan.status === LoanStatus.ACTIVE) {
      loan.status = LoanStatus.OVERDUE;
    }
    await this.loanRepo.save(loan);
  }

  private estimateAccruedInterestForLoan(loan: Loan): number {
    // Грубая оценка суммарных процентов по графику для контроля потолка переплаты.
    return round2((Number(loan.principalByn) * Number(loan.annualRatePercent)) / 100);
  }

  async markDefault(loanId: string): Promise<Loan> {
    const loan = await this.findByIdOrThrow(loanId);
    loan.status = LoanStatus.DEFAULT;
    return this.loanRepo.save(loan);
  }
}
