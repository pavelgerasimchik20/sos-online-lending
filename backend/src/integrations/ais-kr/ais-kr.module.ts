import { Module } from '@nestjs/common';
import { AisKrMockService } from './ais-kr-mock.service';
import { CREDIT_REGISTRY_PORT } from '../interfaces/credit-registry.port';

@Module({
  providers: [AisKrMockService, { provide: CREDIT_REGISTRY_PORT, useExisting: AisKrMockService }],
  exports: [AisKrMockService, CREDIT_REGISTRY_PORT],
})
export class AisKrModule {}
