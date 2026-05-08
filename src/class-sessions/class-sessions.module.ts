import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ClassSessionsController } from './class-sessions.controller';
import { ClassSessionsService } from './class-sessions.service';
import { ClassesController } from './classes.controller';

@Module({
  imports: [AuthModule, OrganizationsModule],
  controllers: [ClassSessionsController, ClassesController],
  providers: [ClassSessionsService],
})
export class ClassSessionsModule {}
