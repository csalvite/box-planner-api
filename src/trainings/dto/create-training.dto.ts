import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTrainingDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['personal', 'group'])
  trainingType: 'personal' | 'group';

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  groupSizeMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  groupSizeMax?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
