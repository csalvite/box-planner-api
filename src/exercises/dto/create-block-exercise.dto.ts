import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateBlockExerciseDto {
  @IsOptional()
  @IsUUID()
  exerciseId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSec?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  restSec?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsString()
  targetArea?: string;

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
