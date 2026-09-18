import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('lender_wallets')
export class LenderWallet extends BaseEntity {
  @Column({ unique: true })
  userId: string;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  balanceByn: number;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  totalInvestedByn: number;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  totalEarnedInterestByn: number;
}
