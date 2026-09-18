import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { OtpPurpose } from '../../common/enums';

@Entity('otp_codes')
export class OtpCode extends BaseEntity {
  @Column()
  phone: string;

  @Column()
  codeHash: string;

  @Column({ type: 'enum', enum: OtpPurpose })
  purpose: OtpPurpose;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt?: Date;

  @Column({ default: 0 })
  attempts: number;
}
