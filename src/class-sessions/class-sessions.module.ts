import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ClassSessionSectionExercisesController } from './class-session-section-exercises.controller';
import { ClassSessionSectionsController } from './class-session-sections.controller';
import { ClassSessionsController } from './class-sessions.controller';
import { ClassSessionsSectionsController } from './class-sessions-sections.controller';
import { ClassSessionsService } from './class-sessions.service';
import { ClassesController } from './classes.controller';

@Module({
  imports: [AuthModule, OrganizationsModule],
  controllers: [
    ClassSessionsController,
    ClassSessionsSectionsController,
    ClassSessionSectionsController,
    ClassSessionSectionExercisesController,
    ClassesController,
  ],
  providers: [ClassSessionsService],
})
export class ClassSessionsModule {}
