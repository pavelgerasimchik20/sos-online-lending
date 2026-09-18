import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { LoansModule } from '../loans/loans.module';
import { UsersModule } from '../users/users.module';
import { SmsModule } from '../../integrations/sms/sms.module';

@Module({
  imports: [LoansModule, UsersModule, SmsModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
