import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BlockCategoriesController } from './block-categories.controller';
import { BlockCategoriesService } from './block-categories.service';

@Module({
  imports: [AuthModule],
  controllers: [BlockCategoriesController],
  providers: [BlockCategoriesService],
})
export class BlockCategoriesModule {}
