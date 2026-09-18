import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanApplication } from './loan-application.entity';
import { LoanApplicationsService } from './loan-applications.service';
import { LoanApplicationsController } from './loan-applications.controller';
import { ProfilesModule } from '../profiles/profiles.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [TypeOrmModule.forFeature([LoanApplication]), ProfilesModule, ScoringModule],
  providers: [LoanApplicationsService],
  controllers: [LoanApplicationsController],
  exports: [LoanApplicationsService],
})
export class LoanApplicationsModule {}
