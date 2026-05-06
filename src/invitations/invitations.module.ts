import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsAuthService } from './invitations-auth.service';
import { InvitationsEmailService } from './invitations-email.service';
import { InvitationsService } from './invitations.service';
import { OrganizationInvitationsController } from './organization-invitations.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationInvitationsController, InvitationsController],
  providers: [
    InvitationsService,
    InvitationsAuthService,
    InvitationsEmailService,
  ],
})
export class InvitationsModule {}
