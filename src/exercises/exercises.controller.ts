import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ReorderExercisesDto } from './dto/reorder-exercises.dto';
import { SupabaseAuthGuard } from 'src/auth/supabase-auth/supabase-auth.guard';
import { OrganizationId } from 'src/organizations/decorators/organization-id.decorator';
import { OrganizationMemberGuard } from 'src/organizations/guards/organization-member.guard';

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OrganizationMemberGuard)
@Controller('organizations/:organizationId/blocks/:blockId/exercises')
export class ExercisesController {
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
  @ApiOperation({ summary: 'Crear ejercicio en un bloque' })
  create(
    @OrganizationId() organizationId: string,
    @Param('blockId') blockId: string,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.exercisesService.create(blockId, organizationId, dto);
  }

  @Patch('reorder')
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
  @ApiOperation({ summary: 'Actualizar ejercicio' })
  update(
    @OrganizationId() organizationId: string,
    @Param('blockId') blockId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: UpdateExerciseDto,
  ) {
    return this.exercisesService.update(
      blockId,
      exerciseId,
      organizationId,
      dto,
    );
  }

  @Delete(':exerciseId')
  @ApiOperation({ summary: 'Eliminar ejercicio' })
  remove(
    @OrganizationId() organizationId: string,
    @Param('blockId') blockId: string,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.exercisesService.remove(blockId, exerciseId, organizationId);
  }
}
