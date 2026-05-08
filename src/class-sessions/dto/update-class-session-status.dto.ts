import { ClassSessionStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateClassSessionStatusDto {
  @IsOptional()
  @IsEnum(ClassSessionStatus)
  status?: ClassSessionStatus;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
