import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.BORROWER)
  @Post('initiate')
  initiate(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(user.userId, dto.loanId, dto.amountByn);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.BORROWER)
  @Post(':id/confirm')
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paymentsService.confirm(user.userId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.BORROWER)
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.listForBorrower(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.LENDER)
  @Get('payouts/mine')
  listPayoutsMine(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.listPayoutsForLender(user.userId);
  }
}
