import { IsString, MinLength } from 'class-validator';

export class RegisterInvitationDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(1)
  displayName: string;

  @IsString()
  @MinLength(8)
  password: string;
}
