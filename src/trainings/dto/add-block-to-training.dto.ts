import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddBlockToTrainingDto {
  @IsString()
  blockId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  customDurationSec?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
