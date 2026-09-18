import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import configuration, { AppConfig } from './config/configuration';
import { GlobalAuthModule } from './common/global-auth.module';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { LoanApplicationsModule } from './modules/loan-applications/loan-applications.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { LoansModule } from './modules/loans/loans.module';
import { DisbursementModule } from './modules/disbursement/disbursement.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { DevToolsModule } from './modules/dev-tools/dev-tools.module';
import { DemoSeedModule } from './modules/demo-seed/demo-seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => ({
        type: 'postgres',
        host: configService.get('db.host', { infer: true }),
        port: configService.get('db.port', { infer: true }),
        username: configService.get('db.username', { infer: true }),
        password: configService.get('db.password', { infer: true }),
        database: configService.get('db.database', { infer: true }),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ScheduleModule.forRoot(),
    GlobalAuthModule,

    UsersModule,
    AuthModule,
    ProfilesModule,
    ScoringModule,
    LoanApplicationsModule,
    WalletModule,
    LoansModule,
    DisbursementModule,
    MarketplaceModule,
    PaymentsModule,
    CollectionsModule,
    NotificationsModule,
    AdminModule,
    DemoSeedModule,
    ...(process.env.NODE_ENV === 'production' ? [] : [DevToolsModule]),
  ],
  controllers: [AppController],
})
export class AppModule {}
