import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { OrganizationId } from '../organizations/decorators/organization-id.decorator';
import { ClassSessionsService } from './class-sessions.service';
import { UpdateClassSessionSectionExerciseDto } from './dto/update-class-session-section-exercise.dto';

@ApiTags('class-session-section-exercises')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('class-session-section-exercises')
export class ClassSessionSectionExercisesController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar ejercicio de una seccion' })
  updateSectionExercise(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateClassSessionSectionExerciseDto,
  ) {
    return this.classSessionsService.updateSectionExerciseForUser(
      user.id,
      id,
      organizationId,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar ejercicio de una seccion' })
  removeSectionExercise(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.classSessionsService.removeSectionExerciseForUser(
      user.id,
      id,
      organizationId,
    );
  }
}
