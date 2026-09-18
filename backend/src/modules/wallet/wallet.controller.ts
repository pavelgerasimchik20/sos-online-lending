import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TopUpDto } from './dto/topup.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LENDER)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.walletService.getOrCreate(user.userId);
  }

  @Post('topup')
  topUp(@CurrentUser() user: AuthenticatedUser, @Body() dto: TopUpDto) {
    return this.walletService.topUp(user.userId, dto.amountByn);
  }

  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.walletService.history(user.userId);
  }
}
