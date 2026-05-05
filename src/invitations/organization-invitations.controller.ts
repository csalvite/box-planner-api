import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { OrganizationMember } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { OrganizationId } from '../organizations/decorators/organization-id.decorator';
import { OrganizationMembership } from '../organizations/decorators/organization-membership.decorator';
import { OrganizationMemberGuard } from '../organizations/guards/organization-member.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('organizations/:organizationId/invitations')
export class OrganizationInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear invitaciÃ³n de organizaciÃ³n' })
  create(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(
      user.id,
      organizationId,
      membership,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar invitaciones de organizaciÃ³n' })
  findAll(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
  ) {
    return this.invitationsService.findAll(organizationId, membership);
  }
}
