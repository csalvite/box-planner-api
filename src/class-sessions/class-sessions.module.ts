import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ClassScheduleDefaultsController } from './class-schedule-defaults.controller';
import { ClassScheduleDefaultsService } from './class-schedule-defaults.service';
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
    ClassScheduleDefaultsController,
    ClassesController,
  ],
  providers: [ClassSessionsService, ClassScheduleDefaultsService],
})
export class ClassSessionsModule {}
