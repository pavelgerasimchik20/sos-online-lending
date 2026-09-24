import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from '../notifications/notifications.service';
import { CollectionsService } from '../collections/collections.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { DemoSeedService } from '../demo-seed/demo-seed.service';

/**
 * Служебные dev-эндпоинты для ручного запуска суточных cron-циклов без
 * ожидания реального времени — удобно для демонстрации просрочек, пени,
 * SMS-напоминаний и стадий взыскания. Регистрируется только вне production
 * (см. AppModule).
 */
@ApiTags('dev-tools')
@Controller('dev/cron')
export class DevToolsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly collectionsService: CollectionsService,
    private readonly marketplaceService: MarketplaceService,
    private readonly demoSeedService: DemoSeedService,
  ) {}

  @Post('run-daily')
  async runDaily() {
    const remindersSent = await this.notificationsService.sendUpcomingPaymentReminders();
    const collectionsResult = await this.collectionsService.runDailyCycle();
    const expiredApplications = await this.marketplaceService.expireStaleApplications();
    return { remindersSent, collectionsResult, expiredApplications };
  }

  /** Удаляет всех тестовых заёмщиков/инвесторов и пересеивает демо-данные с нуля (учётку admin не трогает). */
  @Post('reset-demo-data')
  resetDemoData() {
    return this.demoSeedService.resetAndSeed();
  }
}
