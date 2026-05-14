import {
  Body,
  Controller,
  Delete,
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
import { CreateClassSessionSectionExerciseDto } from './dto/create-class-session-section-exercise.dto';
import { ReorderClassSessionSectionExercisesDto } from './dto/reorder-class-session-section-exercises.dto';
import { UpdateClassSessionSectionDto } from './dto/update-class-session-section.dto';

@ApiTags('class-session-sections')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('class-session-sections')
export class ClassSessionSectionsController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Patch(':sectionId')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Actualizar seccion de una sesion de clase' })
  updateSection(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateClassSessionSectionDto,
  ) {
    return this.classSessionsService.updateSection(
      sectionId,
      organizationId,
      membership,
      dto,
    );
  }

  @Delete(':sectionId')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Eliminar seccion de una sesion de clase' })
  removeSection(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('sectionId') sectionId: string,
  ) {
    return this.classSessionsService.removeSection(
      sectionId,
      organizationId,
      membership,
    );
  }

  @Post(':sectionId/exercises')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Crear ejercicio dentro de una seccion' })
  createSectionExercise(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateClassSessionSectionExerciseDto,
  ) {
    return this.classSessionsService.createSectionExercise(
      sectionId,
      organizationId,
      membership,
      dto,
    );
  }

  @Patch(':sectionId/exercises/reorder')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Reordenar ejercicios dentro de una seccion' })
  reorderSectionExercises(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderClassSessionSectionExercisesDto,
  ) {
    return this.classSessionsService.reorderSectionExercises(
      sectionId,
      organizationId,
      membership,
      dto,
    );
  }
}
