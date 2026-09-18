import { Module } from '@nestjs/common';
import { EripMockService } from './erip-mock.service';
import { PAYMENT_GATEWAY_PORT } from '../interfaces/payment-gateway.port';

@Module({
  providers: [EripMockService, { provide: PAYMENT_GATEWAY_PORT, useExisting: EripMockService }],
  exports: [EripMockService, PAYMENT_GATEWAY_PORT],
})
export class EripModule {}
