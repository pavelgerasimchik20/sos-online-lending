import { Module } from '@nestjs/common';
import { DevToolsController } from './dev-tools.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { CollectionsModule } from '../collections/collections.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { DemoSeedModule } from '../demo-seed/demo-seed.module';

@Module({
  imports: [NotificationsModule, CollectionsModule, MarketplaceModule, DemoSeedModule],
  controllers: [DevToolsController],
})
export class DevToolsModule {}
