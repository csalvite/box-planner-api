import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { OrganizationMember } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { OrganizationId } from '../organizations/decorators/organization-id.decorator';
import { OrganizationMembership } from '../organizations/decorators/organization-membership.decorator';
import { OrganizationWriteAccess } from '../organizations/decorators/organization-roles.decorator';
import { OrganizationMemberGuard } from '../organizations/guards/organization-member.guard';
import { ClassSessionsService } from './class-sessions.service';
import { CreateClassSessionSectionDto } from './dto/create-class-session-section.dto';
import { ReorderClassSessionSectionsDto } from './dto/reorder-class-session-sections.dto';

@ApiTags('class-sessions')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('class-sessions')
export class ClassSessionsSectionsController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Post(':classSessionId/sections')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Crear seccion de una sesion de clase' })
  createSection(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('classSessionId') classSessionId: string,
    @Body() dto: CreateClassSessionSectionDto,
  ) {
    return this.classSessionsService.createSection(
      classSessionId,
      organizationId,
      membership,
      dto,
    );
  }

  @Patch(':classSessionId/sections/reorder')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Reordenar secciones de una sesion de clase' })
  reorderSections(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('classSessionId') classSessionId: string,
    @Body() dto: ReorderClassSessionSectionsDto,
  ) {
    return this.classSessionsService.reorderSections(
      classSessionId,
      organizationId,
      membership,
      dto,
    );
  }
}
