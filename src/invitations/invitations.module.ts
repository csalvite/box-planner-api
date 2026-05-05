import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { OrganizationInvitationsController } from './organization-invitations.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationInvitationsController, InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
