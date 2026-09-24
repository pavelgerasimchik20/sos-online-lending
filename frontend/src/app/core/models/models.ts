export enum UserRole {
  BORROWER = 'BORROWER',
  LENDER = 'LENDER',
  ADMIN = 'ADMIN',
}

export enum KycStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum MsiStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum LoanApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  SCORED = 'SCORED',
  REJECTED = 'REJECTED',
  PUBLISHED_FOR_FUNDING = 'PUBLISHED_FOR_FUNDING',
  AWAITING_BORROWER_CONFIRMATION = 'AWAITING_BORROWER_CONFIRMATION',
  FUNDED = 'FUNDED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
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

export enum CommitmentStatus {
  PENDING_BORROWER_CONFIRMATION = 'PENDING_BORROWER_CONFIRMATION',
  ACTIVE = 'ACTIVE',
  DECLINED_BY_BORROWER = 'DECLINED_BY_BORROWER',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum DefaultStage {
  NONE = 'NONE',
  SOFT_REMINDERS = 'SOFT_REMINDERS',
  PRE_CLAIM = 'PRE_CLAIM',
  LEGAL_ACTION = 'LEGAL_ACTION',
  CLOSED = 'CLOSED',
}

export interface AuthUser {
  id: string;
  phone: string | null;
  username: string | null;
  roles: UserRole[];
  status: string;
}

export interface AdminUser {
  id: string;
  phone: string | null;
  username: string | null;
  roles: UserRole[];
  status: UserStatus;
  phoneVerified: boolean;
  createdAt: string;
  profile?: Profile;
}

export interface PublicStats {
  fundedLoans: number;
  totalDisbursedByn: number;
  activeLenders: number;
  activeBorrowers: number;
  approvalRatePercent: number;
  repaidLoans: number;
  avgFundingWindowDays: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Profile {
  id: string;
  userId: string;
  lastName: string;
  firstName: string;
  patronymic?: string;
  birthDate: string;
  passportSeries: string;
  passportNumber: string;
  passportIssuedBy: string;
  passportIssuedDate: string;
  inn: string;
  registrationAddress: string;
  actualAddress?: string;
  declaredMonthlyIncomeByn: number;
  employer?: string;
  eripAccountRef?: string;
  kycStatus: KycStatus;
  kycRejectionReason?: string;
  kycCheckedAt?: string;
  msiStatus: MsiStatus;
  msiReference?: string;
  msiFailReason?: string;
  msiVerifiedAt?: string;
}

export interface ScheduleRow {
  installmentNo: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  totalDue: number;
}

export interface CalculatePreviewResult {
  note: string;
  referenceAnnualRatePercent: number;
  monthlyPayment: number;
  totalPayable: number;
  totalInterest: number;
  fullCostOfCreditPercent: number;
  schedule: ScheduleRow[];
}

export interface LoanApplication {
  id: string;
  borrowerId: string;
  requestedAmountByn: number;
  requestedTermMonths: number;
  purpose: string;
  status: LoanApplicationStatus;
  grade?: string;
  scoringReasons?: string[];
  approvedAmountByn?: number;
  approvedTermMonths?: number;
  annualRatePercent?: number;
  fundedAmountByn: number;
  publishedAt?: string;
  fundingDeadline?: string;
  fundedAt?: string;
  loanId?: string;
  createdAt: string;
}

export interface BorrowerStats {
  dealsCount: number;
  paidOnTimeCount: number;
  defaultedCount: number;
}

export interface MarketplaceListing {
  applicationId: string;
  grade?: string;
  purpose: string;
  requestedAmountByn: number;
  approvedAmountByn?: number;
  approvedTermMonths?: number;
  annualRatePercent?: number;
  fundedAmountByn: number;
  remainingAmountByn: number;
  fundingDeadline?: string;
  publishedAt?: string;
  borrowerMaskedName?: string;
  borrowerStats?: BorrowerStats;
}

export interface BorrowerStatsRow {
  userId: string;
  maskedName: string;
  applicationsCount: number;
  activeLoansCount: number;
  dealsCount: number;
  paidOnTimeCount: number;
  defaultedCount: number;
}

export interface InvestorStatsRow {
  userId: string;
  maskedName: string;
  balanceByn: number;
  totalInvestedByn: number;
  totalEarnedInterestByn: number;
  dealsCount: number;
}

export interface ContractData {
  commitmentId: string;
  commitmentStatus: CommitmentStatus;
  applicationId: string;
  loanId?: string;
  amountByn: number;
  termMonths?: number;
  annualRatePercent?: number;
  purpose: string;
  createdAt: string;
  borrower: Profile;
  lender: Profile;
  schedule: ScheduleRow[];
}

export interface LenderCommitment {
  id: string;
  applicationId: string;
  lenderId: string;
  amountByn: number;
  status: CommitmentStatus;
  createdAt: string;
}

export interface Loan {
  id: string;
  applicationId: string;
  borrowerId: string;
  principalByn: number;
  annualRatePercent: number;
  termMonths: number;
  status: LoanStatus;
  issuedAt: string;
  closedAt?: string;
  outstandingPrincipalByn: number;
  accruedPenaltyByn: number;
  fullCostOfCreditPercent: number;
}

export interface PaymentScheduleItem {
  id: string;
  loanId: string;
  installmentNo: number;
  dueDate: string;
  principalDueByn: number;
  interestDueByn: number;
  penaltyDueByn: number;
  totalDueByn: number;
  interestPaidByn: number;
  principalPaidByn: number;
  penaltyPaidByn: number;
  status: ScheduleItemStatus;
  paidAt?: string;
  daysOverdue: number;
}

export interface LoanLenderShare {
  id: string;
  loanId: string;
  lenderId: string;
  principalShareByn: number;
  shareRatio: number;
  receivedPrincipalByn: number;
  receivedInterestByn: number;
}

export interface Payment {
  id: string;
  loanId: string;
  borrowerId: string;
  amountByn: number;
  status: PaymentStatus;
  eripInvoiceId?: string;
  eripTransactionId?: string;
  confirmedAt?: string;
  isEarlyRepayment: boolean;
  createdAt: string;
}

export interface LenderPayout {
  id: string;
  paymentId: string;
  loanId: string;
  lenderId: string;
  principalPortionByn: number;
  interestPortionByn: number;
  penaltyPortionByn: number;
  createdAt: string;
}

export interface LenderWallet {
  id: string;
  userId: string;
  balanceByn: number;
  totalInvestedByn: number;
  totalEarnedInterestByn: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: string;
  amountByn: number;
  balanceAfterByn: number;
  relatedEntityId?: string;
  description?: string;
  createdAt: string;
}

export interface DefaultCase {
  id: string;
  loanId: string;
  borrowerId: string;
  stage: DefaultStage;
  maxDaysOverdue: number;
  openedAt: string;
  closedAt?: string;
  stageHistory: { stage: DefaultStage; at: string; daysOverdue: number }[];
  preClaimNoticeText?: string;
  legalActionNoticeText?: string;
}

export interface SmsMessage {
  id: string;
  phone: string;
  template: string;
  body: string;
  status: string;
  createdAt: string;
}

export interface AdminDashboard {
  usersTotal: number;
  usersByRole: { borrowers: number; lenders: number; admins: number };
  applicationsByStatus: Record<string, number>;
  loansByStatus: Record<string, number>;
  openCollectionCases: number;
  outstandingPortfolioByn: number;
}
