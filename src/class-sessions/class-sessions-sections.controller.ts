import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { OrganizationId } from '../organizations/decorators/organization-id.decorator';
import { ClassSessionsService } from './class-sessions.service';
import { CreateClassSessionSectionDto } from './dto/create-class-session-section.dto';
import { FullClassSessionPlanDto } from './dto/full-class-session-plan.dto';
import { ReorderClassSessionSectionsDto } from './dto/reorder-class-session-sections.dto';
import { ScheduleClassSessionFromDefaultDto } from './dto/schedule-class-session-from-default.dto';

@ApiTags('class-sessions')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('class-sessions')
export class ClassSessionsSectionsController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Post(':classSessionId/sections')
  @ApiOperation({ summary: 'Crear seccion de una sesion de clase' })
  createSection(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('classSessionId') classSessionId: string,
    @Body() dto: CreateClassSessionSectionDto,
  ) {
    return this.classSessionsService.createSectionForUser(
      user.id,
      classSessionId,
      organizationId,
      dto,
    );
  }

  @Patch(':classSessionId/sections/reorder')
  @ApiOperation({ summary: 'Reordenar secciones de una sesion de clase' })
  reorderSections(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('classSessionId') classSessionId: string,
    @Body() dto: ReorderClassSessionSectionsDto,
  ) {
    return this.classSessionsService.reorderSectionsForUser(
      user.id,
      classSessionId,
      organizationId,
      dto,
    );
  }

  @Post(':id/schedule-from-default')
  @ApiOperation({ summary: 'Programar clase desde horario por defecto' })
  scheduleFromDefault(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ScheduleClassSessionFromDefaultDto,
  ) {
    return this.classSessionsService.scheduleFromDefaultForUser(
      user.id,
      id,
      organizationId,
      dto,
    );
  }

  @Put(':id/full-plan')
  @ApiOperation({ summary: 'Guardar plan completo de una clase' })
  saveFullPlan(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string | undefined,
    @Param('id') id: string,
    @Body() dto: FullClassSessionPlanDto,
  ) {
    return this.classSessionsService.saveFullPlanForUser(
      user.id,
      id,
      organizationId,
      dto,
    );
  }
}
