import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { LoansService } from '../loans/loans.service';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import { LoanApplicationStatus, LoanStatus } from '../../common/enums';
import { round2 } from '../../common/loan-math';

/**
 * Публичная (без авторизации) сводная статистика для маркетинговой
 * главной страницы — только неперсонализированные агрегаты.
 */
@ApiTags('public')
@Controller('public-stats')
export class PublicStatsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly loansService: LoansService,
    private readonly applicationsService: LoanApplicationsService,
  ) {}

  @Get()
  async stats() {
    const [users, loans, applications] = await Promise.all([
      this.usersService.list(),
      this.loansService.listAll(),
      this.applicationsService.listAll(),
    ]);

    const fundedLoans = loans.length;
    const totalDisbursedByn = round2(loans.reduce((sum, l) => sum + Number(l.principalByn), 0));
    const activeLenders = new Set(users.filter((u) => u.roles.includes('LENDER' as never)).map((u) => u.id)).size;
    const activeBorrowers = new Set(users.filter((u) => u.roles.includes('BORROWER' as never)).map((u) => u.id)).size;
    const approvedApplications = applications.filter(
      (a) => a.status !== LoanApplicationStatus.REJECTED,
    ).length;
    const totalApplications = applications.length;
    const approvalRatePercent = totalApplications > 0 ? Math.round((approvedApplications / totalApplications) * 100) : 0;
    const repaidOnTime = loans.filter((l) => l.status === LoanStatus.CLOSED || l.status === LoanStatus.EARLY_REPAID).length;

    return {
      fundedLoans,
      totalDisbursedByn,
      activeLenders,
      activeBorrowers,
      approvalRatePercent,
      repaidLoans: repaidOnTime,
      avgFundingWindowDays: 3,
    };
  }
}
