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

  /** Инвестор подтвердил предложение мок-ОТП на свой номер (в момент создания предложения). */
  @Column({ type: 'timestamptz', nullable: true })
  lenderSignedAt?: Date | null;

  /** Заёмщик подтвердил получение денег мок-ОТП на свой номер (сделка становится активной). */
  @Column({ type: 'timestamptz', nullable: true })
  borrowerSignedAt?: Date | null;
}
