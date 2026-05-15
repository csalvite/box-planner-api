import { PartialType } from '@nestjs/mapped-types';
import { CreateClassScheduleDefaultDto } from './create-class-schedule-default.dto';

export class UpdateClassScheduleDefaultDto extends PartialType(
  CreateClassScheduleDefaultDto,
) {}
