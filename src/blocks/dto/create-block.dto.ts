import { IsInt, IsOptional, IsString, IsBoolean, Min } from 'class-validator';

export class CreateBlockDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
