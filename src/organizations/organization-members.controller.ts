import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { OrganizationMember } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { OrganizationMembership } from './decorators/organization-membership.decorator';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';
import { OrganizationMemberGuard } from './guards/organization-member.guard';
import { OrganizationMembersService } from './organization-members.service';

@ApiTags('organization members')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('organizations/:organizationId/members')
export class OrganizationMembersController {
  constructor(
    private readonly organizationMembersService: OrganizationMembersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar miembros de organización' })
  findAll(
    @Param('organizationId') organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
  ) {
    return this.organizationMembersService.findAll(organizationId, membership);
  }

  @Patch(':memberId')
  @ApiOperation({ summary: 'Actualizar miembro de organización' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Body() dto: UpdateOrganizationMemberDto,
  ) {
    return this.organizationMembersService.update(
      organizationId,
      memberId,
      membership,
      dto,
    );
  }

  @Delete(':memberId')
  @ApiOperation({ summary: 'Eliminar miembro de organización' })
  remove(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @OrganizationMembership() membership: OrganizationMember,
  ) {
    return this.organizationMembersService.remove(
      organizationId,
      memberId,
      membership,
    );
  }
}
