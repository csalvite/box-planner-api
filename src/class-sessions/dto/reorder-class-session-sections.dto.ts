import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class ClassSessionSectionOrderItem {
  @IsString()
  sectionId: string;

  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderClassSessionSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassSessionSectionOrderItem)
  order: ClassSessionSectionOrderItem[];
}
