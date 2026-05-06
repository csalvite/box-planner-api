import { MemberStatus, OrganizationRole } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateOrganizationMemberDto {
  @IsOptional()
  @IsEnum(OrganizationRole)
  role?: OrganizationRole;

  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;
}
