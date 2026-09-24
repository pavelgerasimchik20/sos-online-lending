import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { CreateCommitmentDto } from './dto/create-commitment.dto';
import { ConfirmFundingDto } from './dto/confirm-funding.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('listings')
  listListings() {
    return this.marketplaceService.listOpenListings();
  }

  /** Обезличенный публичный список активных сделок — вкладка "Активные сделки". */
  @Get('active-deals')
  listActiveDeals() {
    return this.marketplaceService.listActiveDeals();
  }

  /** Инвестор предлагает профинансировать заявку целиком и подписывает предложение ОТП-кодом (деньги на этом шаге не списываются). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LENDER)
  @Post('commitments')
  propose(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCommitmentDto) {
    return this.marketplaceService.propose(user.userId, dto.applicationId, dto.amountByn, dto.otpCode);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LENDER)
  @Get('commitments/mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.listMyCommitments(user.userId);
  }

  /** Инвестор отзывает своё предложение, пока заёмщик не ответил. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LENDER)
  @Post('commitments/:id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.marketplaceService.cancelCommitment(user.userId, id);
  }

  /** Заёмщик получает id своего текущего предложения по заявке (чтобы открыть договор). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BORROWER)
  @Get('applications/:id/commitment')
  getCommitmentForApplication(@CurrentUser() user: AuthenticatedUser, @Param('id') applicationId: string) {
    return this.marketplaceService.getCurrentCommitmentForBorrower(user.userId, applicationId);
  }

  /** Заёмщик подтверждает получение денег и подписывает договор ОТП-кодом — заём выдаётся. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BORROWER)
  @Post('applications/:id/confirm-funding')
  confirmFunding(@CurrentUser() user: AuthenticatedUser, @Param('id') applicationId: string, @Body() dto: ConfirmFundingDto) {
    return this.marketplaceService.confirmFunding(user.userId, applicationId, dto.otpCode);
  }

  /** Заёмщик отклоняет предложение инвестора — средства возвращаются инвестору. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BORROWER)
  @Post('applications/:id/decline-funding')
  declineFunding(@CurrentUser() user: AuthenticatedUser, @Param('id') applicationId: string) {
    return this.marketplaceService.declineFunding(user.userId, applicationId);
  }

  /** Данные для договора займа — доступны только заёмщику и инвестору этой конкретной сделки (или админу). */
  @UseGuards(JwtAuthGuard)
  @Get('commitments/:id/contract')
  getContract(@CurrentUser() user: AuthenticatedUser, @Param('id') commitmentId: string) {
    return this.marketplaceService.getContractData(commitmentId, user.userId, user.roles.includes(UserRole.ADMIN));
  }
}
