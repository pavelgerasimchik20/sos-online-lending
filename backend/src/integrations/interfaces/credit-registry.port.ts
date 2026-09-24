/**
 * Порт для интеграции с АИС КР (Автоматизированная информационная система
 * "Кредитный регистр" Национального банка РБ) — единый источник данных о
 * кредитной истории и текущей долговой нагрузке субъекта по всем
 * зарегистрированным заимодателям (в реальности АИС КР и БКИ — исторически
 * разные системы, но для целей этого сервиса они дают один и тот же по сути
 * набор данных, поэтому здесь объединены в одну интеграцию). В проде
 * реализуется реальным клиентом веб-сервиса Нацбанка; здесь —
 * детерминированным моком.
 */
export interface CreditRegistryDelinquency {
  loanIssuedYear: number;
  worstDelinquencyDays: number;
}

export interface CreditRegistryReport {
  inn: string;
  activeLoansCount: number;
  totalMonthlyObligationsByn: number;
  totalOutstandingDebtByn: number;
  creditHistoryMonths: number;
  closedLoansCount: number;
  creditLimitUtilizationRatio: number;
  worstDelinquencyDaysEver: number;
  delinquenciesLast12Months: number;
  delinquencyHistory: CreditRegistryDelinquency[];
  hasActiveCollectionCase: boolean;
  requestedAt: string;
  raw: Record<string, unknown>;
}

export const CREDIT_REGISTRY_PORT = Symbol('CREDIT_REGISTRY_PORT');

export interface CreditRegistryPort {
  fetchDebtLoad(inn: string, fullName: string): Promise<CreditRegistryReport>;
}
