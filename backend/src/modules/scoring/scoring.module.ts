import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoringResult } from './scoring-result.entity';
import { ScoringService } from './scoring.service';
import { AisKrModule } from '../../integrations/ais-kr/ais-kr.module';

@Module({
  imports: [TypeOrmModule.forFeature([ScoringResult]), AisKrModule],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
