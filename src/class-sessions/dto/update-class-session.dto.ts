import { ClassSessionStatus } from '@prisma/client';
import {
  IsDateString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateClassSessionDto {
  @IsOptional()
  @IsUUID()
  trainingId?: string | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  title?: string;

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
