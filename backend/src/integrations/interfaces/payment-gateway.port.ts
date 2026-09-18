/**
 * Порт для интеграции с ЕРИП (Единое расчётное и информационное
 * пространство) — используется как для приёма платежей от заёмщика
 * (пополнение/оплата графика), так и для выдачи займа заёмщику
 * (disbursement). В проде — реальный клиент ЕРИП; здесь — мок с
 * искусственной задержкой и синхронным "подтверждением" вместо ожидания
 * реального клиента в кассе/интернет-банке.
 */
export interface EripInvoice {
  invoiceId: string;
  amount: number;
  purpose: string;
  createdAt: string;
}

export interface EripConfirmation {
  invoiceId: string;
  status: 'CONFIRMED' | 'FAILED';
  confirmedAt: string;
  eripTransactionId: string;
}

export interface EripPayout {
  payoutId: string;
  amount: number;
  accountRef: string;
  status: 'COMPLETED' | 'FAILED';
  completedAt: string;
}

export const PAYMENT_GATEWAY_PORT = Symbol('PAYMENT_GATEWAY_PORT');

export interface PaymentGatewayPort {
  createInvoice(amount: number, purpose: string): Promise<EripInvoice>;
  confirmInvoice(invoiceId: string): Promise<EripConfirmation>;
  payout(amount: number, accountRef: string): Promise<EripPayout>;
}
