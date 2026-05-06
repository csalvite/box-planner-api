import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtAuthUser } from '../auth/auth.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { RegisterInvitationDto } from './dto/register-invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('preview/:token')
  @ApiOperation({ summary: 'Previsualizar invitación' })
  preview(@Param('token') token: string) {
    return this.invitationsService.preview(token);
  }

  @Post('accept')
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Aceptar invitación' })
  accept(@AuthUser() user: JwtAuthUser, @Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(user, dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrarse desde invitación' })
  register(@Body() dto: RegisterInvitationDto) {
    return this.invitationsService.register(dto);
  }
}
