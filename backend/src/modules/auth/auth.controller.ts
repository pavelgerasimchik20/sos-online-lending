import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseEnumPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ConfirmRegistrationDto } from './dto/confirm-registration.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OtpPurpose, UserRole } from '../../common/enums';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.phone, dto.purpose);
  }

  /** Мок-код для подписи договора займа — на собственный номер текущего пользователя. */
  @UseGuards(JwtAuthGuard)
  @Post('otp/request-signing')
  requestSigningOtp(@CurrentUser() user: AuthenticatedUser) {
    if (!user.phone) {
      throw new BadRequestException('Подпись договора доступна только пользователям с подтверждённым телефоном');
    }
    return this.authService.requestOtp(user.phone, OtpPurpose.CONTRACT_SIGNATURE);
  }

  @Post('register/confirm')
  confirmRegistration(@Body() dto: ConfirmRegistrationDto) {
    return this.authService.confirmRegistration(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('roles/:role')
  addRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('role', new ParseEnumPipe(UserRole)) role: UserRole,
  ) {
    if (role !== UserRole.BORROWER && role !== UserRole.LENDER) {
      throw new BadRequestException('Роль ADMIN не может быть назначена самостоятельно');
    }
    return this.authService.addRoleToSelf(user.userId, role);
  }
}
