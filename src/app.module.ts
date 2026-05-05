import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlocksModule } from './blocks/blocks.module';
import { TrainingsModule } from './trainings/trainings.module';
import { MediaModule } from './media/media.module';
import { ExercisesModule } from './exercises/exercises.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { validateEnv } from './config/env.validation';
import { BlockCategoriesModule } from './block-categories/block-categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    BlocksModule,
    TrainingsModule,
    MediaModule,
    ExercisesModule,
    DashboardModule,
    PrismaModule,
    AuthModule,
    AdminModule,
    OrganizationsModule,
    BlockCategoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
