import { Module } from '@nestjs/common';
import { BkiMockService } from './bki-mock.service';
import { CREDIT_BUREAU_PORT } from '../interfaces/credit-bureau.port';

@Module({
  providers: [BkiMockService, { provide: CREDIT_BUREAU_PORT, useExisting: BkiMockService }],
  exports: [BkiMockService, CREDIT_BUREAU_PORT],
})
export class BkiModule {}
