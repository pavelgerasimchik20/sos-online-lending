import { Module } from '@nestjs/common';
import { DemoSeedService } from './demo-seed.service';
import { UsersModule } from '../users/users.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';

/**
 * Засевает демонстрационные данные (10 заёмщиков с опубликованными заявками
 * + 10 инвесторов с нулевым балансом) при первом старте на пустой базе, и
 * предоставляет `resetAndSeed()` для полного пересева по запросу
 * (см. DevToolsController: POST /dev/reset-demo-data).
 */
@Module({
  imports: [UsersModule, ProfilesModule, LoanApplicationsModule],
  providers: [DemoSeedService],
  exports: [DemoSeedService],
})
export class DemoSeedModule {}
