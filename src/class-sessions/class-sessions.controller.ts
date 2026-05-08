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
import { ListClassSessionsDto } from './dto/list-class-sessions.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';
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
