export enum UserRole {
  BORROWER = 'BORROWER',
  LENDER = 'LENDER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum OtpPurpose {
  REGISTRATION = 'REGISTRATION',
  LOGIN = 'LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  /** Мок-подпись договора займа (и инвестором, и заёмщиком — каждый своим кодом на свой номер). */
  CONTRACT_SIGNATURE = 'CONTRACT_SIGNATURE',
}

export enum KycStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

/** Статус идентификации через МСИ (Межбанковскую систему идентификации). */
export enum MsiStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export enum LoanApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  SCORED = 'SCORED',
  REJECTED = 'REJECTED',
  PUBLISHED_FOR_FUNDING = 'PUBLISHED_FOR_FUNDING',
  /** Инвестор сделал предложение — ждём подтверждения заёмщика (деньги ещё не переданы). */
  AWAITING_BORROWER_CONFIRMATION = 'AWAITING_BORROWER_CONFIRMATION',
  FUNDED = 'FUNDED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ScoringDecision {
  APPROVED = 'APPROVED',
  APPROVED_WITH_CONDITIONS = 'APPROVED_WITH_CONDITIONS',
  REJECTED = 'REJECTED',
}

export enum ScoringGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
}

export enum CommitmentStatus {
  /** Инвестор предложил профинансировать заявку, заёмщик ещё не подтвердил. */
  PENDING_BORROWER_CONFIRMATION = 'PENDING_BORROWER_CONFIRMATION',
  ACTIVE = 'ACTIVE',
  /** Заёмщик отклонил предложение (не то же самое, что CANCELLED инвестором). */
  DECLINED_BY_BORROWER = 'DECLINED_BY_BORROWER',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  DEFAULT = 'DEFAULT',
  CLOSED = 'CLOSED',
  EARLY_REPAID = 'EARLY_REPAID',
}

export enum ScheduleItemStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  ERIP_MOCK = 'ERIP_MOCK',
  WALLET_TOPUP_MOCK = 'WALLET_TOPUP_MOCK',
}

export enum DisbursementStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum DefaultStage {
  NONE = 'NONE',
  SOFT_REMINDERS = 'SOFT_REMINDERS',
  PRE_CLAIM = 'PRE_CLAIM',
  LEGAL_ACTION = 'LEGAL_ACTION',
  CLOSED = 'CLOSED',
}

export enum SmsTemplate {
  OTP_CODE = 'OTP_CODE',
  APPLICATION_APPROVED = 'APPLICATION_APPROVED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  LOAN_ISSUED = 'LOAN_ISSUED',
  PAYMENT_UPCOMING = 'PAYMENT_UPCOMING',
  PAYMENT_DUE_TODAY = 'PAYMENT_DUE_TODAY',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  PRE_CLAIM_NOTICE = 'PRE_CLAIM_NOTICE',
  LEGAL_ACTION_NOTICE = 'LEGAL_ACTION_NOTICE',
  LENDER_PAYOUT_RECEIVED = 'LENDER_PAYOUT_RECEIVED',
  LOAN_FULLY_REPAID = 'LOAN_FULLY_REPAID',
}
