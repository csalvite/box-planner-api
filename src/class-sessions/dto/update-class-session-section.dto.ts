import { PartialType } from '@nestjs/mapped-types';
import { CreateClassSessionSectionDto } from './create-class-session-section.dto';

export class UpdateClassSessionSectionDto extends PartialType(
  CreateClassSessionSectionDto,
) {}
