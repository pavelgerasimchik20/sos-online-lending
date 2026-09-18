import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

export enum WalletTransactionType {
  TOPUP_MOCK = 'TOPUP_MOCK',
  WITHDRAWAL_MOCK = 'WITHDRAWAL_MOCK',
  COMMITMENT_HOLD = 'COMMITMENT_HOLD',
  COMMITMENT_REFUND = 'COMMITMENT_REFUND',
  PAYOUT_PRINCIPAL = 'PAYOUT_PRINCIPAL',
  PAYOUT_INTEREST = 'PAYOUT_INTEREST',
}

@Entity('wallet_transactions')
export class WalletTransaction extends BaseEntity {
  @Index()
  @Column()
  userId: string;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type: WalletTransactionType;

  @Column('decimal', { precision: 14, scale: 2 })
  amountByn: number;

  @Column('decimal', { precision: 14, scale: 2 })
  balanceAfterByn: number;

  @Column({ nullable: true })
  relatedEntityId?: string;

  @Column({ nullable: true })
  description?: string;
}
