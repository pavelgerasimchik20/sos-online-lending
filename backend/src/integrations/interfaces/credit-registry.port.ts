/**
 * Порт для интеграции с АИС КР (Автоматизированная информационная система
 * "Кредитный регистр" Национального банка РБ) — используется для оценки
 * текущей долговой нагрузки субъекта кредитной истории по всем
 * зарегистрированным заимодателям. В проде реализуется реальным клиентом
 * веб-сервиса Нацбанка; здесь — детерминированным моком.
 */
export interface CreditRegistryReport {
  inn: string;
  activeLoansCount: number;
  totalMonthlyObligationsByn: number;
  totalOutstandingDebtByn: number;
  requestedAt: string;
  raw: Record<string, unknown>;
}

export const CREDIT_REGISTRY_PORT = Symbol('CREDIT_REGISTRY_PORT');

export interface CreditRegistryPort {
  fetchDebtLoad(inn: string, fullName: string): Promise<CreditRegistryReport>;
}
