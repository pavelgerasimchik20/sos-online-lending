import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from '../modules/auth/jwt.strategy';

/**
 * @nestjs/passport требует, чтобы PassportModule был виден в каждом модуле,
 * где применяется JwtAuthGuard (AuthGuard('jwt') внутри себя резолвит
 * AuthModuleOptions из PassportModule). Регистрируем его один раз глобально,
 * чтобы не импортировать PassportModule в каждый feature-модуль отдельно.
 */
@Global()
@Module({
  imports: [ConfigModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class GlobalAuthModule {}
