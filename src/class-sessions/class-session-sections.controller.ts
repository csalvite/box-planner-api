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
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { OrganizationId } from '../organizations/decorators/organization-id.decorator';
import { ClassSessionsService } from './class-sessions.service';
import { CreateClassSessionSectionExerciseDto } from './dto/create-class-session-section-exercise.dto';
import { ReorderClassSessionSectionExercisesDto } from './dto/reorder-class-session-section-exercises.dto';
import { UpdateClassSessionSectionDto } from './dto/update-class-session-section.dto';

@ApiTags('class-session-sections')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('class-session-sections')
export class ClassSessionSectionsController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Patch(':sectionId')
  @ApiOperation({ summary: 'Actualizar seccion de una sesion de clase' })
  updateSection(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateClassSessionSectionDto,
  ) {
    return this.classSessionsService.updateSectionForUser(
      user.id,
      sectionId,
      organizationId,
      dto,
    );
  }

  @Delete(':sectionId')
  @ApiOperation({ summary: 'Eliminar seccion de una sesion de clase' })
  removeSection(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('sectionId') sectionId: string,
  ) {
    return this.classSessionsService.removeSectionForUser(
      user.id,
      sectionId,
      organizationId,
    );
  }

  @Post(':sectionId/exercises')
  @ApiOperation({ summary: 'Crear ejercicio dentro de una seccion' })
  createSectionExercise(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateClassSessionSectionExerciseDto,
  ) {
    return this.classSessionsService.createSectionExerciseForUser(
      user.id,
      sectionId,
      organizationId,
      dto,
    );
  }

  @Patch(':sectionId/exercises/reorder')
  @ApiOperation({ summary: 'Reordenar ejercicios dentro de una seccion' })
  reorderSectionExercises(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderClassSessionSectionExercisesDto,
  ) {
    return this.classSessionsService.reorderSectionExercisesForUser(
      user.id,
      sectionId,
      organizationId,
      dto,
    );
  }
}
