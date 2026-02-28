import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

class TrainingBlockOrderItem {
  @IsString()
  trainingBlockId: string;

  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderTrainingBlocksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrainingBlockOrderItem)
  order: TrainingBlockOrderItem[];
}
