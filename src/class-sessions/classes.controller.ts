import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { OrganizationMember } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { OrganizationId } from '../organizations/decorators/organization-id.decorator';
import { OrganizationMembership } from '../organizations/decorators/organization-membership.decorator';
import { OrganizationWriteAccess } from '../organizations/decorators/organization-roles.decorator';
import { OrganizationMemberGuard } from '../organizations/guards/organization-member.guard';
import { ClassSessionsService } from './class-sessions.service';
import { ListClassSessionsDto } from './dto/list-class-sessions.dto';
import { UpdateClassSessionStatusDto } from './dto/update-class-session-status.dto';

@ApiTags('classes')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clases' })
  findAll(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Query() query: ListClassSessionsDto,
  ) {
    return this.classSessionsService.findAll(
      user.id,
      organizationId,
      membership,
      query,
    );
  }

  @Patch(':id/status')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Actualizar estado de una clase' })
  updateStatus(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
    @Body() dto: UpdateClassSessionStatusDto,
  ) {
    return this.classSessionsService.updateStatus(
      id,
      organizationId,
      membership,
      dto,
    );
  }

  @Delete(':id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Eliminar completamente una clase' })
  hardDelete(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
  ) {
    return this.classSessionsService.hardDelete(id, organizationId, membership);
  }
}
