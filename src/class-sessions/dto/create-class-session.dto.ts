import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateClassSessionDto {
  @IsOptional()
  @IsUUID()
  trainingId?: string | null;

  @IsDateString()
  startsAt: string;

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
  @IsIn(['scheduled', 'completed', 'cancelled'])
  status?: 'scheduled' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  notes?: string;
}
