import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { CreateCommitmentDto } from './dto/create-commitment.dto';
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LENDER)
  @Post('commitments')
  commit(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCommitmentDto) {
    return this.marketplaceService.commit(user.userId, dto.applicationId, dto.amountByn);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LENDER)
  @Get('commitments/mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.listMyCommitments(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LENDER)
  @Post('commitments/:id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.marketplaceService.cancelCommitment(user.userId, id);
  }
}
