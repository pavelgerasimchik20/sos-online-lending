import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('loan_lender_shares')
export class LoanLenderShare extends BaseEntity {
  @Index()
  @Column()
  loanId: string;

  @Index()
  @Column()
  lenderId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  principalShareByn: number;

  /** Доля займодавца в сумме основного долга (0..1), используется для пропорционального распределения платежей. */
  @Column('decimal', { precision: 8, scale: 6 })
  shareRatio: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  receivedPrincipalByn: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  receivedInterestByn: number;
}
