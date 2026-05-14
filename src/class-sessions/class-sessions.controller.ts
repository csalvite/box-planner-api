import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { CreateClassSessionSectionDto } from './dto/create-class-session-section.dto';
import { CreateClassSessionSectionExerciseDto } from './dto/create-class-session-section-exercise.dto';
import { ListClassSessionsDto } from './dto/list-class-sessions.dto';
import { ReorderClassSessionSectionExercisesDto } from './dto/reorder-class-session-section-exercises.dto';
import { ReorderClassSessionSectionsDto } from './dto/reorder-class-session-sections.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';
import { UpdateClassSessionSectionDto } from './dto/update-class-session-section.dto';
import { UpdateClassSessionSectionExerciseDto } from './dto/update-class-session-section-exercise.dto';
import { UpdateClassSessionStatusDto } from './dto/update-class-session-status.dto';

@ApiTags('class-sessions')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('organizations/:organizationId/class-sessions')
export class ClassSessionsController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sesiones de clase de una organizaciÃ³n' })
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

  @Post()
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Crear sesiÃ³n de clase' })
  create(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Body() dto: CreateClassSessionDto,
  ) {
    return this.classSessionsService.create(
      user.id,
      organizationId,
      membership,
      dto,
    );
  }

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

  @Get(':id')
  @ApiOperation({ summary: 'Obtener sesiÃ³n de clase por id' })
  findOne(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
  ) {
    return this.classSessionsService.findOne(id, organizationId, membership);
  }

  @Patch(':id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Actualizar sesiÃ³n de clase' })
  update(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
    @Body() dto: UpdateClassSessionDto,
  ) {
    return this.classSessionsService.update(
      id,
      organizationId,
      membership,
      dto,
    );
  }

  @Patch(':id/status')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Actualizar estado de una sesiÃƒÂ³n de clase' })
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
  @ApiOperation({ summary: 'Eliminar sesiÃ³n de clase' })
  remove(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
  ) {
    return this.classSessionsService.remove(id, organizationId, membership);
  }

  @Patch('sections/:sectionId')
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

  @Delete('sections/:sectionId')
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

  @Post('sections/:sectionId/exercises')
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

  @Patch('sections/:sectionId/exercises/reorder')
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

  @Patch('section-exercises/:id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Actualizar ejercicio de una seccion' })
  updateSectionExercise(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
    @Body() dto: UpdateClassSessionSectionExerciseDto,
  ) {
    return this.classSessionsService.updateSectionExercise(
      id,
      organizationId,
      membership,
      dto,
    );
  }

  @Delete('section-exercises/:id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Eliminar ejercicio de una seccion' })
  removeSectionExercise(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
  ) {
    return this.classSessionsService.removeSectionExercise(
      id,
      organizationId,
      membership,
    );
  }

  @Post(':id/attendance')
  @ApiOperation({ summary: 'Marcar asistencia a clase' })
  markAttendance(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
  ) {
    return this.classSessionsService.markAttendance(
      user.id,
      id,
      organizationId,
      membership,
    );
  }

  @Delete(':id/attendance')
  @ApiOperation({ summary: 'Cancelar asistencia a clase' })
  removeAttendance(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
  ) {
    return this.classSessionsService.removeAttendance(
      user.id,
      id,
      organizationId,
      membership,
    );
  }
}
