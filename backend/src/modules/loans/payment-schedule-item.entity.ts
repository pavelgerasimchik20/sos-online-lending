import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { ScheduleItemStatus } from '../../common/enums';

@Entity('payment_schedule_items')
export class PaymentScheduleItem extends BaseEntity {
  @Index()
  @Column()
  loanId: string;

  @Column('int')
  installmentNo: number;

  @Column({ type: 'date' })
  dueDate: string;

  @Column('decimal', { precision: 12, scale: 2 })
  principalDueByn: number;

  @Column('decimal', { precision: 12, scale: 2 })
  interestDueByn: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  penaltyDueByn: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalDueByn: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  interestPaidByn: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  principalPaidByn: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  penaltyPaidByn: number;

  @Column({ type: 'enum', enum: ScheduleItemStatus, default: ScheduleItemStatus.PENDING })
  status: ScheduleItemStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column('int', { default: 0 })
  daysOverdue: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastPenaltyAccrualAt?: Date;

  @Column({ type: 'date', nullable: true })
  lastReminderSentOn?: string;
}
