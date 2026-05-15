import {
  Body,
  Controller,
  Delete,
  Get,
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
import { ClassScheduleDefaultsService } from './class-schedule-defaults.service';
import { CreateClassScheduleDefaultDto } from './dto/create-class-schedule-default.dto';
import { UpdateClassScheduleDefaultDto } from './dto/update-class-schedule-default.dto';

@ApiTags('class-schedule-defaults')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('class-schedule-defaults')
export class ClassScheduleDefaultsController {
  constructor(
    private readonly classScheduleDefaultsService: ClassScheduleDefaultsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar horarios por defecto de clases' })
  findAll(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
  ) {
    return this.classScheduleDefaultsService.findAll(
      organizationId,
      membership,
    );
  }

  @Post()
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Crear horario por defecto de clase' })
  create(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Body() dto: CreateClassScheduleDefaultDto,
  ) {
    return this.classScheduleDefaultsService.create(
      organizationId,
      membership,
      dto,
    );
  }

  @Patch(':id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Actualizar horario por defecto de clase' })
  update(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
    @Body() dto: UpdateClassScheduleDefaultDto,
  ) {
    return this.classScheduleDefaultsService.update(
      id,
      organizationId,
      membership,
      dto,
    );
  }

  @Delete(':id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Eliminar horario por defecto de clase' })
  remove(
    @OrganizationId() organizationId: string,
    @OrganizationMembership() membership: OrganizationMember,
    @Param('id') id: string,
  ) {
    return this.classScheduleDefaultsService.remove(
      id,
      organizationId,
      membership,
    );
  }
}
