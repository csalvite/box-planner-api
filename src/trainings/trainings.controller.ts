import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { AddBlockToTrainingDto } from './dto/add-block-to-training.dto';
import { ReorderTrainingBlocksDto } from './dto/reorder-training-blocks.dto';

@UseGuards(SupabaseAuthGuard)
@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Post()
  create(@AuthUser() user: { id: string }, @Body() dto: CreateTrainingDto) {
    return this.trainingsService.create(user.id, dto);
  }

  @Get()
  findAll(@AuthUser() user: { id: string }) {
    return this.trainingsService.findAll(user.id);
  }

  @Get(':trainingId')
  findOne(
    @Param('trainingId') trainingId: string,
    @AuthUser() user: { id: string },
  ) {
    return this.trainingsService.findOne(trainingId, user.id);
  }

  @Patch(':trainingId')
  update(
    @Param('trainingId') trainingId: string,
    @AuthUser() user: { id: string },
    @Body() dto: UpdateTrainingDto,
  ) {
    return this.trainingsService.update(trainingId, user.id, dto);
  }

  @Delete(':trainingId')
  remove(
    @Param('trainingId') trainingId: string,
    @AuthUser() user: { id: string },
  ) {
    return this.trainingsService.remove(trainingId, user.id);
  }

  // --- training blocks ---
  @Post(':trainingId/blocks')
  addBlock(
    @Param('trainingId') trainingId: string,
    @AuthUser() user: { id: string },
    @Body() dto: AddBlockToTrainingDto,
  ) {
    return this.trainingsService.addBlock(trainingId, user.id, dto);
  }

  @Delete(':trainingId/blocks/:trainingBlockId')
  removeBlock(
    @Param('trainingId') trainingId: string,
    @Param('trainingBlockId') trainingBlockId: string,
    @AuthUser() user: { id: string },
  ) {
    return this.trainingsService.removeBlock(
      trainingId,
      trainingBlockId,
      user.id,
    );
  }

  @Patch(':trainingId/blocks/reorder')
  reorderBlocks(
    @Param('trainingId') trainingId: string,
    @AuthUser() user: { id: string },
    @Body() dto: ReorderTrainingBlocksDto,
  ) {
    return this.trainingsService.reorderBlocks(trainingId, user.id, dto);
  }
}
