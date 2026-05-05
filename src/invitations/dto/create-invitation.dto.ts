import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(['OWNER', 'ADMIN', 'COACH', 'VIEWER'])
  role?: 'OWNER' | 'ADMIN' | 'COACH' | 'VIEWER';
}
