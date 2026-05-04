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
import { TrainingsService } from './trainings.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { OrganizationId } from '../organizations/decorators/organization-id.decorator';
import { OrganizationMemberGuard } from '../organizations/guards/organization-member.guard';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { AddBlockToTrainingDto } from './dto/add-block-to-training.dto';
import { ReorderTrainingBlocksDto } from './dto/reorder-training-blocks.dto';

@ApiTags('trainings')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('organizations/:organizationId/trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear entrenamiento en una organización' })
  create(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string,
    @Body() dto: CreateTrainingDto,
  ) {
    return this.trainingsService.create(user.id, organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar entrenamientos de una organización' })
  findAll(@OrganizationId() organizationId: string) {
    return this.trainingsService.findAll(organizationId);
  }

  @Get(':trainingId')
  @ApiOperation({ summary: 'Obtener entrenamiento por id' })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('trainingId') trainingId: string,
  ) {
    return this.trainingsService.findOne(trainingId, organizationId);
  }

  @Patch(':trainingId')
  @ApiOperation({ summary: 'Actualizar entrenamiento' })
  update(
    @OrganizationId() organizationId: string,
    @Param('trainingId') trainingId: string,
    @Body() dto: UpdateTrainingDto,
  ) {
    return this.trainingsService.update(trainingId, organizationId, dto);
  }

  @Delete(':trainingId')
  @ApiOperation({ summary: 'Eliminar entrenamiento' })
  remove(
    @OrganizationId() organizationId: string,
    @Param('trainingId') trainingId: string,
  ) {
    return this.trainingsService.remove(trainingId, organizationId);
  }

  @Post(':trainingId/blocks')
  @ApiOperation({ summary: 'Añadir bloque a entrenamiento' })
  addBlock(
    @OrganizationId() organizationId: string,
    @Param('trainingId') trainingId: string,
    @Body() dto: AddBlockToTrainingDto,
  ) {
    return this.trainingsService.addBlock(trainingId, organizationId, dto);
  }

  @Patch(':trainingId/blocks/reorder')
  @ApiOperation({ summary: 'Reordenar bloques de un entrenamiento' })
  reorderBlocks(
    @OrganizationId() organizationId: string,
    @Param('trainingId') trainingId: string,
    @Body() dto: ReorderTrainingBlocksDto,
  ) {
    return this.trainingsService.reorderBlocks(
      trainingId,
      organizationId,
      dto,
    );
  }

  @Delete(':trainingId/blocks/:trainingBlockId')
  @ApiOperation({ summary: 'Eliminar bloque de entrenamiento' })
  removeBlock(
    @OrganizationId() organizationId: string,
    @Param('trainingId') trainingId: string,
    @Param('trainingBlockId') trainingBlockId: string,
  ) {
    return this.trainingsService.removeBlock(
      trainingId,
      trainingBlockId,
      organizationId,
    );
  }
}
