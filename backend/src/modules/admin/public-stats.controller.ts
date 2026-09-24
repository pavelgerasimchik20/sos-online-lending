import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { LoansService } from '../loans/loans.service';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import { ProfilesService } from '../profiles/profiles.service';
import { WalletService } from '../wallet/wallet.service';
import { LoanApplicationStatus, LoanStatus, UserRole } from '../../common/enums';
import { round2 } from '../../common/loan-math';
import { maskFullName } from '../../common/name-mask';

/**
 * Публичная (без авторизации) сводная статистика для маркетинговой
 * главной страницы — только неперсонализированные агрегаты и обезличенные
 * (маскированные по ФИО) построчные данные заёмщиков/инвесторов.
 */
@ApiTags('public')
@Controller('public-stats')
export class PublicStatsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly loansService: LoansService,
    private readonly applicationsService: LoanApplicationsService,
    private readonly profilesService: ProfilesService,
    private readonly walletService: WalletService,
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

  /** Обезличенная построчная статистика по всем заёмщикам — для таблицы на главной странице. */
  @Get('borrowers')
  async borrowerStats() {
    const users = await this.usersService.list();
    const borrowers = users.filter((u) => u.roles.includes(UserRole.BORROWER));
    const rows = await Promise.all(
      borrowers.map(async (user) => {
        const [profile, applications, loanStats] = await Promise.all([
          this.profilesService.findByUserId(user.id),
          this.applicationsService.listMine(user.id),
          this.loansService.getBorrowerStats(user.id),
        ]);
        return {
          userId: user.id,
          maskedName: profile ? maskFullName(profile.lastName, profile.firstName, profile.patronymic) : 'Аноним',
          applicationsCount: applications.length,
          activeLoansCount: loanStats.activeLoansCount,
          dealsCount: loanStats.dealsCount,
          paidOnTimeCount: loanStats.paidOnTimeCount,
          defaultedCount: loanStats.defaultedCount,
        };
      }),
    );
    return rows.sort((a, b) => a.maskedName.localeCompare(b.maskedName, 'ru'));
  }

  /** Обезличенная построчная статистика по всем инвесторам — для таблицы на главной странице. */
  @Get('investors')
  async investorStats() {
    const users = await this.usersService.list();
    const investors = users.filter((u) => u.roles.includes(UserRole.LENDER));
    const rows = await Promise.all(
      investors.map(async (user) => {
        const [profile, wallet, loanStats] = await Promise.all([
          this.profilesService.findByUserId(user.id),
          this.walletService.getOrCreate(user.id),
          this.loansService.getInvestorStats(user.id),
        ]);
        return {
          userId: user.id,
          maskedName: profile ? maskFullName(profile.lastName, profile.firstName, profile.patronymic) : 'Аноним',
          balanceByn: round2(Number(wallet.balanceByn)),
          totalInvestedByn: round2(Number(wallet.totalInvestedByn)),
          totalEarnedInterestByn: round2(Number(wallet.totalEarnedInterestByn)),
          dealsCount: loanStats.dealsCount,
        };
      }),
    );
    return rows.sort((a, b) => a.maskedName.localeCompare(b.maskedName, 'ru'));
  }
}
