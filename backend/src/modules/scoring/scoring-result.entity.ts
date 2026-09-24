import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { ScoringDecision, ScoringGrade } from '../../common/enums';

@Entity('scoring_results')
export class ScoringResult extends BaseEntity {
  @Index()
  @Column()
  applicationId: string;

  @Column()
  inn: string;

  /** Полный мок-ответ АИС КР (кредитная история + долговая нагрузка), как будто действительно полученный от системы. */
  @Column('jsonb')
  creditReport: Record<string, unknown>;

  @Column('decimal', { precision: 5, scale: 4 })
  debtToIncomeRatio: number;

  @Column('int')
  score: number;

  @Column({ type: 'enum', enum: ScoringGrade })
  grade: ScoringGrade;

  @Column({ type: 'enum', enum: ScoringDecision })
  decision: ScoringDecision;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  approvedAmountByn?: number;

  @Column('int', { nullable: true })
  approvedTermMonths?: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  annualRatePercent?: number;

  @Column('jsonb')
  reasons: string[];
}
