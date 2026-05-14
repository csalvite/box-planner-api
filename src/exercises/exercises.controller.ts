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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ListExercisesQueryDto } from './dto/list-exercises-query.dto';
import { ReorderExercisesDto } from './dto/reorder-exercises.dto';
import { CreateBlockExerciseDto } from './dto/create-block-exercise.dto';
import { UpdateBlockExerciseDto } from './dto/update-block-exercise.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { OrganizationId } from '../organizations/decorators/organization-id.decorator';
import { OrganizationWriteAccess } from '../organizations/decorators/organization-roles.decorator';
import { OrganizationMemberGuard } from '../organizations/guards/organization-member.guard';

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar biblioteca de ejercicios' })
  findAll(
    @OrganizationId() organizationId: string,
    @Query() query: ListExercisesQueryDto,
  ) {
    return this.exercisesService.listLibraryExercises(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ejercicio de biblioteca por id' })
  findOne(@OrganizationId() organizationId: string, @Param('id') id: string) {
    return this.exercisesService.findLibraryExercise(id, organizationId);
  }

  @Post()
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Crear ejercicio de biblioteca' })
  create(
    @AuthUser() user: { id: string },
    @OrganizationId() organizationId: string,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.exercisesService.createLibraryExercise(
      user.id,
      organizationId,
      dto,
    );
  }

  @Patch(':id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Actualizar ejercicio de biblioteca' })
  update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
  ) {
    return this.exercisesService.updateLibraryExercise(id, organizationId, dto);
  }

  @Delete(':id')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Desactivar ejercicio de biblioteca' })
  remove(@OrganizationId() organizationId: string, @Param('id') id: string) {
    return this.exercisesService.softDeleteLibraryExercise(id, organizationId);
  }
}

@ApiTags('block-exercises')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('organizations/:organizationId/blocks/:blockId/exercises')
export class BlockExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ejercicios de un bloque' })
  findAll(
    @OrganizationId() organizationId: string,
    @Param('blockId') blockId: string,
  ) {
    return this.exercisesService.findAll(blockId, organizationId);
  }

  @Post()
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Crear ejercicio en un bloque' })
  create(
    @OrganizationId() organizationId: string,
    @Param('blockId') blockId: string,
    @Body() dto: CreateBlockExerciseDto,
  ) {
    return this.exercisesService.create(blockId, organizationId, dto);
  }

  @Patch('reorder')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Reordenar ejercicios de un bloque' })
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  reorder(
    @OrganizationId() organizationId: string,
    @Param('blockId') blockId: string,
    @Body() dto: ReorderExercisesDto,
  ) {
    return this.exercisesService.reorder(blockId, organizationId, dto);
  }

  @Patch(':exerciseId')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Actualizar ejercicio' })
  update(
    @OrganizationId() organizationId: string,
    @Param('blockId') blockId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: UpdateBlockExerciseDto,
  ) {
    return this.exercisesService.update(
      blockId,
      exerciseId,
      organizationId,
      dto,
    );
  }

  @Delete(':exerciseId')
  @OrganizationWriteAccess()
  @ApiOperation({ summary: 'Eliminar ejercicio' })
  remove(
    @OrganizationId() organizationId: string,
    @Param('blockId') blockId: string,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.exercisesService.remove(blockId, exerciseId, organizationId);
  }
}
