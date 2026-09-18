/**
 * Порт для интеграции с БКИ (бюро кредитных историй). В реальной системе —
 * запрос кредитного отчёта через оператора БКИ. Здесь возвращается
 * детерминированный (по ИНН) мок-объект, который используется в
 * ScoringModule как "кредитный отчёт, пришедший из БКИ".
 */
export interface CreditBureauDelinquency {
  loanIssuedYear: number;
  worstDelinquencyDays: number;
}

export interface CreditBureauReport {
  inn: string;
  creditHistoryMonths: number;
  activeLoansCount: number;
  closedLoansCount: number;
  totalActiveDebtByn: number;
  creditLimitUtilizationRatio: number;
  worstDelinquencyDaysEver: number;
  delinquenciesLast12Months: number;
  delinquencyHistory: CreditBureauDelinquency[];
  hasActiveCollectionCase: boolean;
  requestedAt: string;
  raw: Record<string, unknown>;
}

export const CREDIT_BUREAU_PORT = Symbol('CREDIT_BUREAU_PORT');

export interface CreditBureauPort {
  fetchReport(inn: string, fullName: string): Promise<CreditBureauReport>;
}
