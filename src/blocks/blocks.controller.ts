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
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { OrganizationId } from '../organizations/decorators/organization-id.decorator';
import { OrganizationWriteAccess } from '../organizations/decorators/organization-roles.decorator';
import { OrganizationMemberGuard } from '../organizations/guards/organization-member.guard';

@ApiTags('blocks')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('organizations/:organizationId/blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Crear bloque en una organización' })
  create(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.blocksService.create(user.id, organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar bloques de una organización' })
  findAll(@OrganizationId() organizationId: string) {
    return this.blocksService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener bloque por id' })
  findOne(@OrganizationId() organizationId: string, @Param('id') id: string) {
    return this.blocksService.findOne(id, organizationId);
  }

  @Patch(':id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Actualizar bloque' })
  update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBlockDto,
  ) {
    return this.blocksService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Eliminar bloque' })
  remove(@OrganizationId() organizationId: string, @Param('id') id: string) {
    return this.blocksService.remove(id, organizationId);
  }
}
