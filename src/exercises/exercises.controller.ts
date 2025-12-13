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
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ReorderExercisesDto } from './dto/reorder-exercises.dto';
import { AuthUser } from 'src/auth/user/user.decorator';
import { SupabaseAuthGuard } from 'src/auth/supabase-auth/supabase-auth.guard';

@UseGuards(SupabaseAuthGuard)
@Controller('blocks/:blockId/exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  findAll(@AuthUser() user: { id: string }, @Param('blockId') blockId: string) {
    return this.exercisesService.findAll(blockId, user.id);
  }

  @Post()
  create(
    @AuthUser() user: { id: string },
    @Param('blockId') blockId: string,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.exercisesService.create(blockId, user.id, dto);
  }

  @Patch(':exerciseId')
  update(
    @AuthUser() user: { id: string },
    @Param('blockId') blockId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: UpdateExerciseDto,
  ) {
    return this.exercisesService.update(blockId, exerciseId, user.id, dto);
  }

  @Delete(':exerciseId')
  remove(
    @AuthUser() user: { id: string },
    @Param('blockId') blockId: string,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.exercisesService.remove(blockId, exerciseId, user.id);
  }

  @Patch('reorder')
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  reorder(
    @AuthUser() user: { id: string },
    @Param('blockId') blockId: string,
    @Body() dto: ReorderExercisesDto,
  ) {
    return this.exercisesService.reorder(blockId, user.id, dto);
  }
}
