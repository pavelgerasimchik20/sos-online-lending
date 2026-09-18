import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoansService } from '../loans/loans.service';
import { UsersService } from '../users/users.service';
import { ScheduleItemStatus, SmsTemplate } from '../../common/enums';
import { SMS_GATEWAY_PORT, SmsGatewayPort } from '../../integrations/interfaces/sms-gateway.port';
import { LEGAL_RULES } from '../../config/legal-rules.config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(
    private readonly loansService: LoansService,
    private readonly usersService: UsersService,
    @Inject(SMS_GATEWAY_PORT) private readonly smsGateway: SmsGatewayPort,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendUpcomingPaymentReminders(): Promise<number> {
    const items = (await this.loansService.findOpenScheduleItems()).filter(
      (i) => i.status === ScheduleItemStatus.PENDING,
    );
    const todayStr = new Date().toISOString().slice(0, 10);
    let sentCount = 0;

    for (const item of items) {
      if (item.lastReminderSentOn === todayStr) continue;

      const daysUntilDue = Math.round(
        (new Date(item.dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24),
      );

      let template: SmsTemplate | undefined;
      if (daysUntilDue === LEGAL_RULES.NOTIFICATIONS.REMIND_BEFORE_DUE_DAYS) {
        template = SmsTemplate.PAYMENT_UPCOMING;
      } else if (daysUntilDue === 0) {
        template = SmsTemplate.PAYMENT_DUE_TODAY;
      }
      if (!template) continue;

      const loan = await this.loansService.findByIdOrThrow(item.loanId);
      const borrower = await this.usersService.findByIdOrThrow(loan.borrowerId);
      const text =
        template === SmsTemplate.PAYMENT_UPCOMING
          ? `SOS: Напоминаем — ${item.dueDate} платёж по займу ${item.totalDueByn} BYN. Оплатите через ЕРИП в личном кабинете.`
          : `SOS: Сегодня срок платежа по займу — ${item.totalDueByn} BYN. Оплатите через ЕРИП, чтобы избежать пени.`;

      await this.smsGateway.send(borrower.phone, template, text, { loanId: item.loanId, installmentNo: item.installmentNo });
      item.lastReminderSentOn = todayStr;
      await this.loansService.saveScheduleItem(item);
      sentCount += 1;
    }

    this.logger.log(`Отправлено напоминаний о платеже: ${sentCount}`);
    return sentCount;
  }
}
