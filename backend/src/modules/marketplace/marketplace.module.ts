import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LenderCommitment } from './lender-commitment.entity';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';
import { WalletModule } from '../wallet/wallet.module';
import { DisbursementModule } from '../disbursement/disbursement.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { UsersModule } from '../users/users.module';
import { LoansModule } from '../loans/loans.module';
import { SmsModule } from '../../integrations/sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LenderCommitment]),
    LoanApplicationsModule,
    WalletModule,
    DisbursementModule,
    ProfilesModule,
    UsersModule,
    LoansModule,
    SmsModule,
  ],
  providers: [MarketplaceService],
  controllers: [MarketplaceController],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
