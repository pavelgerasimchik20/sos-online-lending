import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Disbursement } from './disbursement.entity';
import { LoansService, CommitmentForIssuance } from '../loans/loans.service';
import { ProfilesService } from '../profiles/profiles.service';
import { UsersService } from '../users/users.service';
import { LoanApplication } from '../loan-applications/loan-application.entity';
import { DisbursementStatus, SmsTemplate } from '../../common/enums';
import {
  PAYMENT_GATEWAY_PORT,
  PaymentGatewayPort,
} from '../../integrations/interfaces/payment-gateway.port';
import { SMS_GATEWAY_PORT, SmsGatewayPort } from '../../integrations/interfaces/sms-gateway.port';
import { Loan } from '../loans/loan.entity';

@Injectable()
export class DisbursementService {
  private readonly logger = new Logger('Disbursement');

  constructor(
    @InjectRepository(Disbursement) private readonly repo: Repository<Disbursement>,
    private readonly loansService: LoansService,
    private readonly profilesService: ProfilesService,
    private readonly usersService: UsersService,
    @Inject(PAYMENT_GATEWAY_PORT) private readonly paymentGateway: PaymentGatewayPort,
    @Inject(SMS_GATEWAY_PORT) private readonly smsGateway: SmsGatewayPort,
  ) {}

  /** Полный сбор средств собран -> выдаём заём: создаём Loan, график, и выполняем мок-выплату через ЕРИП. */
  async issueAndDisburse(
    application: LoanApplication,
    commitments: CommitmentForIssuance[],
  ): Promise<{ loan: Loan; disbursement: Disbursement }> {
    const loan = await this.loansService.issue(application, commitments);
    const profile = await this.profilesService.findByUserIdOrThrow(application.borrowerId);

    const accountRef = profile.eripAccountRef ?? `ERIP-MOCK-${application.borrowerId.slice(0, 8)}`;
    let disbursement = this.repo.create({
      loanId: loan.id,
      borrowerId: application.borrowerId,
      amountByn: loan.principalByn,
      status: DisbursementStatus.PENDING,
      accountRef,
    });
    disbursement = await this.repo.save(disbursement);

    try {
      const payout = await this.paymentGateway.payout(Number(loan.principalByn), accountRef);
      disbursement.status = payout.status === 'COMPLETED' ? DisbursementStatus.COMPLETED : DisbursementStatus.FAILED;
      disbursement.eripPayoutId = payout.payoutId;
      disbursement.completedAt = new Date(payout.completedAt);
    } catch (error) {
      this.logger.error('Ошибка мок-выплаты через ЕРИП', error as Error);
      disbursement.status = DisbursementStatus.FAILED;
    }
    disbursement = await this.repo.save(disbursement);

    const borrower = await this.usersService.findByIdOrThrow(application.borrowerId);
    await this.smsGateway.send(
      borrower.phone,
      SmsTemplate.LOAN_ISSUED,
      `SOS: Ваш заём на сумму ${loan.principalByn} BYN выдан и зачислен через ЕРИП. Первый платёж — согласно графику в личном кабинете.`,
      { loanId: loan.id },
    );

    return { loan, disbursement };
  }

  listForLoan(loanId: string): Promise<Disbursement[]> {
    return this.repo.find({ where: { loanId } });
  }
}
