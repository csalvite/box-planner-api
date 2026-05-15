import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateClassScheduleDefaultDto {
  @IsOptional()
  @IsUUID()
  coachId?: string | null;

  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number;

  @Matches(TIME_PATTERN)
  startsAtTime: string;

  @Matches(TIME_PATTERN)
  endsAtTime: string;

  @IsOptional()
  @IsString()
  label?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
