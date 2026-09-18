import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { LenderPayout } from './lender-payout.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { LoansModule } from '../loans/loans.module';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { EripModule } from '../../integrations/erip/erip.module';
import { SmsModule } from '../../integrations/sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, LenderPayout]),
    LoansModule,
    UsersModule,
    WalletModule,
    EripModule,
    SmsModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
