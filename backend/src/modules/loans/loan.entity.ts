import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { LoanStatus } from '../../common/enums';

@Entity('loans')
export class Loan extends BaseEntity {
  @Index()
  @Column()
  applicationId: string;

  @Index()
  @Column()
  borrowerId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  principalByn: number;

  @Column('decimal', { precision: 5, scale: 2 })
  annualRatePercent: number;

  @Column('int')
  termMonths: number;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.ACTIVE })
  status: LoanStatus;

  @Column({ type: 'timestamptz' })
  issuedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  outstandingPrincipalByn: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  accruedPenaltyByn: number;

  @Column('decimal', { precision: 5, scale: 2 })
  fullCostOfCreditPercent: number;
}
