import { PartialType } from '@nestjs/mapped-types';
import { CreateBlockExerciseDto } from './create-block-exercise.dto';

export class UpdateBlockExerciseDto extends PartialType(
  CreateBlockExerciseDto,
) {}
