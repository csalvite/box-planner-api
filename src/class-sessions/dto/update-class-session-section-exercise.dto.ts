import { PartialType } from '@nestjs/mapped-types';
import { CreateClassSessionSectionExerciseDto } from './create-class-session-section-exercise.dto';

export class UpdateClassSessionSectionExerciseDto extends PartialType(
  CreateClassSessionSectionExerciseDto,
) {}
