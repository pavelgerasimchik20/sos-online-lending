import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { LoanApplicationStatus, ScoringGrade } from '../../common/enums';

@Entity('loan_applications')
export class LoanApplication extends BaseEntity {
  @Index()
  @Column()
  borrowerId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  requestedAmountByn: number;

  @Column('int')
  requestedTermMonths: number;

  @Column()
  purpose: string;

  @Column({ type: 'enum', enum: LoanApplicationStatus, default: LoanApplicationStatus.SUBMITTED })
  status: LoanApplicationStatus;

  @Column({ nullable: true })
  scoringResultId?: string;

  @Column({ type: 'enum', enum: ScoringGrade, nullable: true })
  grade?: ScoringGrade;

  @Column('jsonb', { nullable: true })
  scoringReasons?: string[];

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  approvedAmountByn?: number;

  @Column('int', { nullable: true })
  approvedTermMonths?: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  annualRatePercent?: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  fundedAmountByn: number;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fundingDeadline?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fundedAt?: Date;

  @Column({ nullable: true })
  loanId?: string;
}
