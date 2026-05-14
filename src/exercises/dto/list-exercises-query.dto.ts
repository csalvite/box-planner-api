import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  exercise_category as ExerciseCategory,
  exercise_intensity as ExerciseIntensity,
  exercise_level as ExerciseLevel,
} from '@prisma/client';

const toOptionalBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }

  return value;
};

const toOptionalStringArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);
};

export class ListExercisesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @IsOptional()
  @IsEnum(ExerciseLevel)
  level?: ExerciseLevel;

  @IsOptional()
  @IsEnum(ExerciseIntensity)
  intensity?: ExerciseIntensity;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  requiresPartner?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(toOptionalStringArray)
  @IsUUID(undefined, { each: true })
  tagIds?: string[];

  @IsOptional()
  @Transform(toOptionalStringArray)
  @IsUUID(undefined, { each: true })
  materialIds?: string[];
}
