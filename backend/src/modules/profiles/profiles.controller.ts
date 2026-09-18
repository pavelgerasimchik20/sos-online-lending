import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('profiles')
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.findByUserId(user.userId);
  }

  @Post('me')
  submitMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitKycDto) {
    return this.profilesService.submit(user.userId, dto);
  }

  @Post('me/msi/verify')
  verifyMsi(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.verifyMsi(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  list() {
    return this.profilesService.list();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/review/:decision')
  review(@Param('id') id: string, @Param('decision') decision: 'approve' | 'reject') {
    return this.profilesService.manualReview(id, decision === 'approve');
  }
}
