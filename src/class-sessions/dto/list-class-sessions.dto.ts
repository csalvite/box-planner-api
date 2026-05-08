import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum ClassSessionListStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ALL = 'ALL',
}

export enum ClassSessionEnabledFilter {
  TRUE = 'true',
  FALSE = 'false',
  ALL = 'ALL',
}

export class ListClassSessionsDto {
  @IsOptional()
  @IsEnum(ClassSessionListStatus)
  status?: ClassSessionListStatus;

  @IsOptional()
  @IsEnum(ClassSessionEnabledFilter)
  enabled?: ClassSessionEnabledFilter;

  @IsOptional()
  @IsUUID()
  trainingId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
