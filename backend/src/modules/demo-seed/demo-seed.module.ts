import { Module } from '@nestjs/common';
import { DemoSeedService } from './demo-seed.service';
import { UsersModule } from '../users/users.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { WalletModule } from '../wallet/wallet.module';
import { LoansModule } from '../loans/loans.module';
import { PaymentsModule } from '../payments/payments.module';

/**
 * Засевает демонстрационные данные (маркетплейс + инвестор с реальной сделкой)
 * при первом старте на пустой базе — чтобы заказчик после клонирования репозитория
 * сразу видел работающую демонстрацию, а не пустые экраны.
 */
@Module({
  imports: [
    UsersModule,
    ProfilesModule,
    LoanApplicationsModule,
    MarketplaceModule,
    WalletModule,
    LoansModule,
    PaymentsModule,
  ],
  providers: [DemoSeedService],
})
export class DemoSeedModule {}
