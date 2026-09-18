import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { UserRole } from '../../common/enums';

/**
 * Гарантирует наличие встроенной учётной записи администратора
 * (логин "admin" / пароль "admin") сразу в базе данных при старте сервиса —
 * без необходимости отдельно её регистрировать.
 */
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('AdminSeed');

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.usersService.findByUsername('admin');
    if (existing) {
      return;
    }
    const passwordHash = await bcrypt.hash('admin', 10);
    await this.usersService.createServiceAccount('admin', passwordHash, [UserRole.ADMIN]);
    this.logger.log('Создана встроенная учётная запись администратора: admin / admin');
  }
}
