import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationMemberGuard } from './guards/organization-member.guard';
import { OrganizationMembersController } from './organization-members.controller';
import { OrganizationMembersService } from './organization-members.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController, OrganizationMembersController],
  providers: [
    OrganizationsService,
    OrganizationMembersService,
    OrganizationMemberGuard,
  ],
  exports: [OrganizationsService, OrganizationMemberGuard],
})
export class OrganizationsModule {}
