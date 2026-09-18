import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('loans')
@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.BORROWER)
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.loansService.listForBorrower(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.LENDER)
  @Get('my-portfolio')
  myPortfolio(@CurrentUser() user: AuthenticatedUser) {
    return this.loansService.listSharesForLender(user.userId);
  }

  @Get(':id')
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const loan = await this.loansService.findByIdOrThrow(id);
    await this.assertAccess(user, loan.id, loan.borrowerId);
    return loan;
  }

  @Get(':id/schedule')
  async getSchedule(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const loan = await this.loansService.findByIdOrThrow(id);
    await this.assertAccess(user, loan.id, loan.borrowerId);
    return this.loansService.listSchedule(id);
  }

  @Get(':id/shares')
  async getShares(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const loan = await this.loansService.findByIdOrThrow(id);
    await this.assertAccess(user, loan.id, loan.borrowerId);
    return this.loansService.listShares(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  listAll() {
    return this.loansService.listAll();
  }

  private async assertAccess(user: AuthenticatedUser, loanId: string, borrowerId: string): Promise<void> {
    if (user.roles.includes(UserRole.ADMIN) || user.userId === borrowerId) {
      return;
    }
    if (user.roles.includes(UserRole.LENDER)) {
      const shares = await this.loansService.listShares(loanId);
      if (shares.some((s) => s.lenderId === user.userId)) {
        return;
      }
    }
    throw new ForbiddenException('Нет доступа к этому займу');
  }
}
