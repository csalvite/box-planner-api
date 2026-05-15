import { ClassSessionStatus } from '@prisma/client';
import {
  IsDateString,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateClassSessionDto {
  @IsOptional()
  @IsUUID()
  trainingId?: string | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  targetDurationMinutes?: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  coachId?: string;

  @IsOptional()
  @IsEnum(ClassSessionStatus)
  status?: ClassSessionStatus;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
