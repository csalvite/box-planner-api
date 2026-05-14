import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class ClassSessionSectionExerciseOrderItem {
  @IsString()
  exerciseId: string;

  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderClassSessionSectionExercisesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassSessionSectionExerciseOrderItem)
  order: ClassSessionSectionExerciseOrderItem[];
}
