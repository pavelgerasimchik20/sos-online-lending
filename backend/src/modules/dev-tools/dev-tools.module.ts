import { Module } from '@nestjs/common';
import { DevToolsController } from './dev-tools.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { CollectionsModule } from '../collections/collections.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [NotificationsModule, CollectionsModule, MarketplaceModule],
  controllers: [DevToolsController],
})
export class DevToolsModule {}
