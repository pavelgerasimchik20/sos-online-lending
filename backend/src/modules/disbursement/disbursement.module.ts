import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disbursement } from './disbursement.entity';
import { DisbursementService } from './disbursement.service';
import { LoansModule } from '../loans/loans.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { UsersModule } from '../users/users.module';
import { EripModule } from '../../integrations/erip/erip.module';
import { SmsModule } from '../../integrations/sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Disbursement]),
    LoansModule,
    ProfilesModule,
    UsersModule,
    EripModule,
    SmsModule,
  ],
  providers: [DisbursementService],
  exports: [DisbursementService],
})
export class DisbursementModule {}
