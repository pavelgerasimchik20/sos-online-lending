import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole, UserStatus, LoanApplicationStatus, LoanStatus } from '../../common/enums';
import { UsersService } from '../users/users.service';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import { LoansService } from '../loans/loans.service';
import { CollectionsService } from '../collections/collections.service';
import { SmsMockService } from '../../integrations/sms/sms-mock.service';
import { LEGAL_RULES } from '../../config/legal-rules.config';
import { AdminCreateUserDto } from './dto/create-user.dto';
import { UpdateRolesDto } from './dto/update-roles.dto';
import { round2 } from '../../common/loan-math';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly applicationsService: LoanApplicationsService,
    private readonly loansService: LoansService,
    private readonly collectionsService: CollectionsService,
    private readonly smsService: SmsMockService,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const [users, applications, loans, openCases] = await Promise.all([
      this.usersService.list(),
      this.applicationsService.listAll(),
      this.loansService.listAll(),
      this.collectionsService.listOpen(),
    ]);

    const countBy = <T extends string>(items: { status: T }[]) =>
      items.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      }, {});

    return {
      usersTotal: users.length,
      usersByRole: {
        borrowers: users.filter((u) => u.roles.includes(UserRole.BORROWER)).length,
        lenders: users.filter((u) => u.roles.includes(UserRole.LENDER)).length,
        admins: users.filter((u) => u.roles.includes(UserRole.ADMIN)).length,
      },
      applicationsByStatus: countBy<LoanApplicationStatus>(applications),
      loansByStatus: countBy<LoanStatus>(loans),
      openCollectionCases: openCases.length,
      outstandingPortfolioByn: round2(
        loans
          .filter((l) => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE || l.status === LoanStatus.DEFAULT)
          .reduce((sum, l) => sum + Number(l.outstandingPrincipalByn), 0),
      ),
    };
  }

  @Get('sms-log')
  smsLog() {
    return this.smsService.listAll();
  }

  @Get('legal-rules')
  legalRules() {
    return LEGAL_RULES;
  }

  // --- Учёт пользователей ---

  @Get('users')
  listUsers() {
    return this.usersService.list();
  }

  @Post('users')
  async createUser(@Body() dto: AdminCreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.usersService.adminCreateUser({ login: dto.login, roles: dto.roles, passwordHash });
  }

  @Post('users/:id/block')
  block(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    if (admin.userId === id) {
      throw new BadRequestException('Нельзя заблокировать самого себя');
    }
    return this.usersService.setStatus(id, UserStatus.BLOCKED);
  }

  @Post('users/:id/unblock')
  unblock(@Param('id') id: string) {
    return this.usersService.setStatus(id, UserStatus.ACTIVE);
  }

  @Post('users/:id/roles')
  updateRoles(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRolesDto) {
    if (admin.userId === id && !dto.roles.includes(UserRole.ADMIN)) {
      throw new BadRequestException('Нельзя снять с себя роль администратора');
    }
    return this.usersService.setRoles(id, dto.roles);
  }

  @Delete('users/:id')
  async deleteUser(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    if (admin.userId === id) {
      throw new BadRequestException('Нельзя удалить самого себя');
    }
    await this.usersService.deleteUser(id);
    return { deleted: true };
  }
}
