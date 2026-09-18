import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { DefaultStage } from '../../common/enums';

export interface DefaultStageHistoryEntry {
  stage: DefaultStage;
  at: string;
  daysOverdue: number;
}

@Entity('default_cases')
export class DefaultCase extends BaseEntity {
  @Index({ unique: true })
  @Column()
  loanId: string;

  @Column()
  borrowerId: string;

  @Column({ type: 'enum', enum: DefaultStage, default: DefaultStage.SOFT_REMINDERS })
  stage: DefaultStage;

  @Column('int', { default: 0 })
  maxDaysOverdue: number;

  @Column({ type: 'timestamptz' })
  openedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @Column('jsonb', { default: () => "'[]'" })
  stageHistory: DefaultStageHistoryEntry[];

  @Column('text', { nullable: true })
  preClaimNoticeText?: string;

  @Column('text', { nullable: true })
  legalActionNoticeText?: string;

  @Column({ type: 'date', nullable: true })
  lastSoftReminderSentOn?: string;
}
