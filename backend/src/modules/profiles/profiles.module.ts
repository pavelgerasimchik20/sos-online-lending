import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './profile.entity';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { PassportVerificationService } from './passport-verification.service';
import { MsiModule } from '../../integrations/msi/msi.module';

@Module({
  imports: [TypeOrmModule.forFeature([Profile]), MsiModule],
  providers: [ProfilesService, PassportVerificationService],
  controllers: [ProfilesController],
  exports: [ProfilesService],
})
export class ProfilesModule {}
