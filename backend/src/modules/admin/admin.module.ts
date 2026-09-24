import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PublicStatsController } from './public-stats.controller';
import { UsersModule } from '../users/users.module';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';
import { LoansModule } from '../loans/loans.module';
import { CollectionsModule } from '../collections/collections.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { WalletModule } from '../wallet/wallet.module';
import { SmsModule } from '../../integrations/sms/sms.module';

@Module({
  imports: [UsersModule, LoanApplicationsModule, LoansModule, CollectionsModule, ProfilesModule, WalletModule, SmsModule],
  controllers: [AdminController, PublicStatsController],
})
export class AdminModule {}
