import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsMessage } from './sms-message.entity';
import { SmsMockService } from './sms-mock.service';
import { SMS_GATEWAY_PORT } from '../interfaces/sms-gateway.port';

@Module({
  imports: [TypeOrmModule.forFeature([SmsMessage])],
  providers: [SmsMockService, { provide: SMS_GATEWAY_PORT, useExisting: SmsMockService }],
  exports: [SmsMockService, SMS_GATEWAY_PORT],
})
export class SmsModule {}
