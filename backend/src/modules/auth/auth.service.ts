import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { OtpCode } from './otp.entity';
import { UsersService } from '../users/users.service';
import { OtpPurpose, SmsTemplate, UserRole, UserStatus } from '../../common/enums';
import { SMS_GATEWAY_PORT, SmsGatewayPort } from '../../integrations/interfaces/sms-gateway.port';
import { ConfirmRegistrationDto } from './dto/confirm-registration.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/user.entity';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokenPayload {
  sub: string;
  phone: string | null;
  roles: UserRole[];
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(SMS_GATEWAY_PORT) private readonly smsGateway: SmsGatewayPort,
  ) {}

  async requestOtp(phone: string, purpose: OtpPurpose): Promise<{ devCode?: string; expiresInSeconds: number }> {
    if (purpose === OtpPurpose.REGISTRATION) {
      const existing = await this.usersService.findByPhone(phone);
      if (existing) {
        throw new ConflictException('Пользователь с таким номером телефона уже зарегистрирован');
      }
    }
    if (purpose === OtpPurpose.LOGIN) {
      const existing = await this.usersService.findByPhone(phone);
      if (!existing) {
        throw new BadRequestException('Пользователь с таким номером телефона не найден');
      }
    }

    // Инвалидируем все ранее выданные неиспользованные коды для этого номера/цели.
    await this.otpRepo.update({ phone, purpose }, { consumedAt: new Date() });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const ttlSeconds = this.configService.get<number>('otpTtlSeconds') ?? 300;
    const otp = this.otpRepo.create({
      phone,
      purpose,
      codeHash: await bcrypt.hash(code, 8),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    });
    await this.otpRepo.save(otp);

    await this.smsGateway.send(
      phone,
      SmsTemplate.OTP_CODE,
      `SOS: Ваш код подтверждения — ${code}. Никому не сообщайте его.`,
      { purpose },
    );

    const isProduction = this.configService.get('NODE_ENV') === 'production';
    return { devCode: isProduction ? undefined : code, expiresInSeconds: ttlSeconds };
  }

  private async verifyOtp(phone: string, purpose: OtpPurpose, code: string): Promise<void> {
    const otp = await this.otpRepo.findOne({
      where: { phone, purpose },
      order: { createdAt: 'DESC' },
    });
    if (!otp || otp.consumedAt) {
      throw new BadRequestException('Код не найден. Запросите новый код');
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Срок действия кода истёк. Запросите новый код');
    }
    if (otp.attempts >= 5) {
      throw new BadRequestException('Превышено число попыток. Запросите новый код');
    }
    const matches = await bcrypt.compare(code, otp.codeHash);
    if (!matches) {
      otp.attempts += 1;
      await this.otpRepo.save(otp);
      throw new BadRequestException('Неверный код подтверждения');
    }
    otp.consumedAt = new Date();
    await this.otpRepo.save(otp);
  }

  async confirmRegistration(dto: ConfirmRegistrationDto): Promise<AuthTokens & { user: SafeUser }> {
    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('Пользователь с таким номером телефона уже зарегистрирован');
    }
    await this.verifyOtp(dto.phone, OtpPurpose.REGISTRATION, dto.code);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser(dto.phone, passwordHash, [dto.role ?? UserRole.BORROWER]);
    return { ...this.issueTokens(user), user: toSafeUser(user) };
  }

  async login(dto: LoginDto): Promise<AuthTokens & { user: SafeUser }> {
    const user = await this.usersService.findByLoginIdentifier(dto.login);
    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Учётная запись заблокирована');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }
    return { ...this.issueTokens(user), user: toSafeUser(user) };
  }

  async addRoleToSelf(
    userId: string,
    role: UserRole.BORROWER | UserRole.LENDER,
  ): Promise<AuthTokens & { user: SafeUser }> {
    const user = await this.usersService.addRole(userId, role);
    // JWT уже выпущен со старым набором ролей — перевыпускаем токены, иначе
    // защищённые новой ролью эндпоинты (например, /wallet) вернут 403 до
    // истечения старого access-токена.
    return { ...this.issueTokens(user), user: toSafeUser(user) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: AuthTokenPayload;
    try {
      payload = this.jwtService.verify<AuthTokenPayload>(refreshToken, {
        secret: this.configService.get('jwtRefreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Недействительный refresh-токен');
    }
    const user = await this.usersService.findByIdOrThrow(payload.sub);
    return this.issueTokens(user);
  }

  issueTokens(user: User): AuthTokens {
    const payload: AuthTokenPayload = { sub: user.id, phone: user.phone, roles: user.roles };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwtAccessSecret'),
      expiresIn: this.configService.get('jwtAccessTtl'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwtRefreshSecret'),
      expiresIn: this.configService.get('jwtRefreshTtl'),
    });
    return { accessToken, refreshToken };
  }
}

export interface SafeUser {
  id: string;
  phone: string | null;
  username: string | null;
  roles: UserRole[];
  status: UserStatus;
}

function toSafeUser(user: User): SafeUser {
  return { id: user.id, phone: user.phone, username: user.username, roles: user.roles, status: user.status };
}
