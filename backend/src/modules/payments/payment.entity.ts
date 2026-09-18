import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { PaymentMethod, PaymentStatus } from '../../common/enums';

@Entity('payments')
export class Payment extends BaseEntity {
  @Index()
  @Column()
  loanId: string;

  @Column()
  borrowerId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amountByn: number;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.ERIP_MOCK })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true })
  eripInvoiceId?: string;

  @Column({ nullable: true })
  eripTransactionId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt?: Date;

  @Column({ default: false })
  isEarlyRepayment: boolean;
}
