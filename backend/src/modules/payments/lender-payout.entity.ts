import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('lender_payouts')
export class LenderPayout extends BaseEntity {
  @Index()
  @Column()
  paymentId: string;

  @Index()
  @Column()
  loanId: string;

  @Index()
  @Column()
  lenderId: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  principalPortionByn: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  interestPortionByn: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  penaltyPortionByn: number;
}
