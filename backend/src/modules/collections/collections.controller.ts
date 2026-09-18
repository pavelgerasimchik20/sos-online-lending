import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { LoansService } from '../loans/loans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('collections')
@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly loansService: LoansService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('cases')
  listOpen() {
    return this.collectionsService.listOpen();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('cases/all')
  listAll() {
    return this.collectionsService.listAll();
  }

  @Get('loans/:loanId/case')
  async findForLoan(@CurrentUser() user: AuthenticatedUser, @Param('loanId') loanId: string) {
    const loan = await this.loansService.findByIdOrThrow(loanId);
    if (!user.roles.includes(UserRole.ADMIN) && user.userId !== loan.borrowerId) {
      const shares = await this.loansService.listShares(loanId);
      if (!shares.some((s) => s.lenderId === user.userId)) {
        throw new ForbiddenException('Нет доступа к делу по этому займу');
      }
    }
    return this.collectionsService.findByLoan(loanId);
  }
}
