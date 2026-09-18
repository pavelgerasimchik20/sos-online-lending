import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { LenderPayout } from './lender-payout.entity';
import { LoansService } from '../loans/loans.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletTransactionType } from '../wallet/wallet-transaction.entity';
import { PaymentMethod, PaymentStatus, SmsTemplate } from '../../common/enums';
import {
  PAYMENT_GATEWAY_PORT,
  PaymentGatewayPort,
} from '../../integrations/interfaces/payment-gateway.port';
import { SMS_GATEWAY_PORT, SmsGatewayPort } from '../../integrations/interfaces/sms-gateway.port';
import { round2 } from '../../common/loan-math';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(LenderPayout) private readonly payoutRepo: Repository<LenderPayout>,
    private readonly loansService: LoansService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    @Inject(PAYMENT_GATEWAY_PORT) private readonly paymentGateway: PaymentGatewayPort,
    @Inject(SMS_GATEWAY_PORT) private readonly smsGateway: SmsGatewayPort,
  ) {}

  async initiate(borrowerId: string, loanId: string, amountByn: number): Promise<Payment> {
    if (amountByn <= 0) {
      throw new BadRequestException('Сумма платежа должна быть положительной');
    }
    const loan = await this.loansService.findByIdOrThrow(loanId);
    if (loan.borrowerId !== borrowerId) {
      throw new ForbiddenException('Заём принадлежит другому пользователю');
    }

    const invoice = await this.paymentGateway.createInvoice(amountByn, `Платёж по займу ${loanId}`);

    let payment = this.paymentRepo.create({
      loanId,
      borrowerId,
      amountByn,
      method: PaymentMethod.ERIP_MOCK,
      status: PaymentStatus.PENDING,
      eripInvoiceId: invoice.invoiceId,
      isEarlyRepayment: amountByn >= Number(loan.outstandingPrincipalByn),
    });
    payment = await this.paymentRepo.save(payment);
    return payment;
  }

  async confirm(borrowerId: string, paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Платёж не найден');
    }
    if (payment.borrowerId !== borrowerId) {
      throw new ForbiddenException('Платёж принадлежит другому пользователю');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Платёж уже обработан');
    }

    const confirmation = await this.paymentGateway.confirmInvoice(payment.eripInvoiceId!);
    if (confirmation.status !== 'CONFIRMED') {
      payment.status = PaymentStatus.FAILED;
      return this.paymentRepo.save(payment);
    }

    payment.status = PaymentStatus.CONFIRMED;
    payment.eripTransactionId = confirmation.eripTransactionId;
    payment.confirmedAt = new Date();
    await this.paymentRepo.save(payment);

    const allocation = await this.loansService.allocatePayment(payment.loanId, Number(payment.amountByn));

    for (const [lenderId, portions] of allocation.perLender.entries()) {
      if (portions.principal <= 0 && portions.interest <= 0 && portions.penalty <= 0) continue;

      await this.payoutRepo.save(
        this.payoutRepo.create({
          paymentId: payment.id,
          loanId: payment.loanId,
          lenderId,
          principalPortionByn: round2(portions.principal),
          interestPortionByn: round2(portions.interest),
          penaltyPortionByn: round2(portions.penalty),
        }),
      );

      if (portions.principal > 0) {
        await this.walletService.credit(
          lenderId,
          round2(portions.principal),
          WalletTransactionType.PAYOUT_PRINCIPAL,
          payment.loanId,
          'Возврат тела займа по платежу заёмщика',
        );
      }
      const earnings = round2(portions.interest + portions.penalty);
      if (earnings > 0) {
        await this.walletService.credit(
          lenderId,
          earnings,
          WalletTransactionType.PAYOUT_INTEREST,
          payment.loanId,
          'Доход (проценты/пеня) по платежу заёмщика',
        );
      }
      await this.loansService.recordLenderReceipt(payment.loanId, lenderId, portions.principal, portions.interest);

      const lender = await this.usersService.findByIdOrThrow(lenderId);
      await this.smsGateway.send(
        lender.phone,
        SmsTemplate.LENDER_PAYOUT_RECEIVED,
        `SOS: Получена выплата по займу — тело ${round2(portions.principal)} BYN, доход ${earnings} BYN.`,
        { loanId: payment.loanId },
      );
    }

    const borrower = await this.usersService.findByIdOrThrow(borrowerId);
    const loan = await this.loansService.findByIdOrThrow(payment.loanId);
    await this.smsGateway.send(
      borrower.phone,
      loan.status === 'CLOSED' || loan.status === 'EARLY_REPAID' ? SmsTemplate.LOAN_FULLY_REPAID : SmsTemplate.PAYMENT_RECEIVED,
      loan.status === 'CLOSED' || loan.status === 'EARLY_REPAID'
        ? 'SOS: Заём полностью погашен. Спасибо за своевременное исполнение обязательств!'
        : `SOS: Платёж на сумму ${payment.amountByn} BYN получен и зачислен в счёт погашения займа.`,
      { loanId: payment.loanId },
    );

    return payment;
  }

  listForLoan(loanId: string): Promise<Payment[]> {
    return this.paymentRepo.find({ where: { loanId }, order: { createdAt: 'DESC' } });
  }

  listForBorrower(borrowerId: string): Promise<Payment[]> {
    return this.paymentRepo.find({ where: { borrowerId }, order: { createdAt: 'DESC' } });
  }

  listPayoutsForLender(lenderId: string): Promise<LenderPayout[]> {
    return this.payoutRepo.find({ where: { lenderId }, order: { createdAt: 'DESC' } });
  }
}
