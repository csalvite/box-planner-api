import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExerciseOrderItem {
  @IsString()
  exerciseId: string;

  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderExercisesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseOrderItem)
  order: ExerciseOrderItem[];
}
