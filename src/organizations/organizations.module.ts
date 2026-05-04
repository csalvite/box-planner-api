import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationMemberGuard } from './guards/organization-member.guard';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationMemberGuard],
  exports: [OrganizationsService, OrganizationMemberGuard],
})
export class OrganizationsModule {}
