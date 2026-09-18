import { Module } from '@nestjs/common';
import { MsiMockService } from './msi-mock.service';
import { MSI_PORT } from '../interfaces/msi.port';

@Module({
  providers: [MsiMockService, { provide: MSI_PORT, useExisting: MsiMockService }],
  exports: [MsiMockService, MSI_PORT],
})
export class MsiModule {}
