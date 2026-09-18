import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { KycStatus, MsiStatus } from '../../common/enums';
import { User } from '../users/user.entity';

@Entity('profiles')
export class Profile extends BaseEntity {
  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  lastName: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  patronymic?: string;

  @Column({ type: 'date' })
  birthDate: string;

  @Column()
  passportSeries: string;

  @Column()
  passportNumber: string;

  @Column()
  passportIssuedBy: string;

  @Column({ type: 'date' })
  passportIssuedDate: string;

  /** Идентификационный номер (аналог ИНН/личного номера в РБ) */
  @Column()
  inn: string;

  @Column()
  registrationAddress: string;

  @Column({ nullable: true })
  actualAddress?: string;

  @Column('decimal', { precision: 12, scale: 2 })
  declaredMonthlyIncomeByn: number;

  @Column({ nullable: true })
  employer?: string;

  /** Реквизиты для зачисления/списания через ЕРИП (мок) */
  @Column({ nullable: true })
  eripAccountRef?: string;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.NOT_SUBMITTED })
  kycStatus: KycStatus;

  @Column({ type: 'varchar', nullable: true })
  kycRejectionReason?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  kycCheckedAt?: Date;

  @Column({ type: 'enum', enum: MsiStatus, default: MsiStatus.NOT_STARTED })
  msiStatus: MsiStatus;

  @Column({ type: 'varchar', nullable: true })
  msiReference?: string | null;

  @Column({ type: 'varchar', nullable: true })
  msiFailReason?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  msiVerifiedAt?: Date | null;
}
