import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { SmsTemplate } from '../../common/enums';

@Entity('sms_messages')
export class SmsMessage extends BaseEntity {
  @Column()
  phone: string;

  @Column({ type: 'enum', enum: SmsTemplate })
  template: SmsTemplate;

  @Column('text')
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, unknown>;

  @Column({ default: 'SENT' })
  status: string;
}
