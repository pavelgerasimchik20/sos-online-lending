import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { DisbursementStatus } from '../../common/enums';

@Entity('disbursements')
export class Disbursement extends BaseEntity {
  @Column()
  loanId: string;

  @Column()
  borrowerId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amountByn: number;

  @Column({ type: 'enum', enum: DisbursementStatus, default: DisbursementStatus.PENDING })
  status: DisbursementStatus;

  @Column({ nullable: true })
  eripPayoutId?: string;

  @Column({ nullable: true })
  accountRef?: string;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
