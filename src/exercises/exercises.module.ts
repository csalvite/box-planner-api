import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import {
  BlockExercisesController,
  ExercisesController,
} from './exercises.controller';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [ExercisesController, BlockExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
