import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
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
import { UpdateClassSessionSectionExerciseDto } from './dto/update-class-session-section-exercise.dto';

@ApiTags('class-session-section-exercises')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('class-session-section-exercises')
export class ClassSessionSectionExercisesController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Patch(':id')
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

  @Delete(':id')
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
}
