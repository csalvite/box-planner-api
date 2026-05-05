import { IsString } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  token: string;
}
