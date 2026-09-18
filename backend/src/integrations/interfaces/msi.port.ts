/**
 * Порт для интеграции с МСИ (Межбанковской системой идентификации) —
 * реальной инфраструктурой удалённой идентификации физлиц в РБ. После того
 * как клиент один раз подтвердил личность через МСИ (обычно — сверка с
 * биометрией/паспортными данными на стороне банка-участника), любой
 * финансовый сервис может опираться на этот факт, не запрашивая повторное
 * бумажное удостоверение личности. Здесь — детерминированный мок.
 */
export interface MsiVerificationResult {
  verified: boolean;
  reference: string;
  checkedAt: string;
  reason?: string;
}

export const MSI_PORT = Symbol('MSI_PORT');

export interface MsiPort {
  verifyIdentity(input: {
    inn: string;
    passportSeries: string;
    passportNumber: string;
    fullName: string;
  }): Promise<MsiVerificationResult>;
}
