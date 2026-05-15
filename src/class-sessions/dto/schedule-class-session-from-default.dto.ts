import { IsOptional, IsUUID, Matches } from 'class-validator';

export class ScheduleClassSessionFromDefaultDto {
  @IsUUID()
  scheduleDefaultId: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}
