import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { CommitmentStatus } from '../../common/enums';

@Entity('lender_commitments')
export class LenderCommitment extends BaseEntity {
  @Index()
  @Column()
  applicationId: string;

  @Index()
  @Column()
  lenderId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amountByn: number;

  @Column({ type: 'enum', enum: CommitmentStatus, default: CommitmentStatus.ACTIVE })
  status: CommitmentStatus;
}
