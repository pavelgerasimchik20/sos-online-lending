import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  EripConfirmation,
  EripInvoice,
  EripPayout,
  PaymentGatewayPort,
} from '../interfaces/payment-gateway.port';

/**
 * Мок интеграции с ЕРИП. В реальной системе оплата инициируется заёмщиком
 * в интернет-банке/инфокиоске по номеру счёта/услуге СОЗ, а подтверждение
 * приходит асинхронным колбэком от ЕРИП. Здесь `confirmInvoice` вызывается
 * напрямую (синхронно, "как если бы клиент оплатил") — это единственное
 * упрощение по сравнению с реальным асинхронным протоколом.
 */
@Injectable()
export class EripMockService implements PaymentGatewayPort {
  private readonly logger = new Logger('ЕРИП (мок)');

  async createInvoice(amount: number, purpose: string): Promise<EripInvoice> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const invoice: EripInvoice = {
      invoiceId: randomUUID(),
      amount,
      purpose,
      createdAt: new Date().toISOString(),
    };
    this.logger.log(`Счёт ЕРИП создан ${invoice.invoiceId}: ${amount} BYN — ${purpose}`);
    return invoice;
  }

  async confirmInvoice(invoiceId: string): Promise<EripConfirmation> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const confirmation: EripConfirmation = {
      invoiceId,
      status: 'CONFIRMED',
      confirmedAt: new Date().toISOString(),
      eripTransactionId: `ERIP-${Date.now()}-${randomUUID().slice(0, 8)}`,
    };
    this.logger.log(`Платёж по счёту ${invoiceId} подтверждён: ${confirmation.eripTransactionId}`);
    return confirmation;
  }

  async payout(amount: number, accountRef: string): Promise<EripPayout> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const payout: EripPayout = {
      payoutId: randomUUID(),
      amount,
      accountRef,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
    };
    this.logger.log(`Выплата ${amount} BYN на ${accountRef} выполнена: ${payout.payoutId}`);
    return payout;
  }
}
