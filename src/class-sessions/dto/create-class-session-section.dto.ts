import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateClassSessionSectionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
