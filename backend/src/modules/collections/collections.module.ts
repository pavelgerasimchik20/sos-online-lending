import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefaultCase } from './default-case.entity';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { LoansModule } from '../loans/loans.module';
import { UsersModule } from '../users/users.module';
import { SmsModule } from '../../integrations/sms/sms.module';

@Module({
  imports: [TypeOrmModule.forFeature([DefaultCase]), LoansModule, UsersModule, SmsModule],
  providers: [CollectionsService],
  controllers: [CollectionsController],
  exports: [CollectionsService],
})
export class CollectionsModule {}
