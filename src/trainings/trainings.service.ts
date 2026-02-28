import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { AddBlockToTrainingDto } from './dto/add-block-to-training.dto';
import { ReorderTrainingBlocksDto } from './dto/reorder-training-blocks.dto';

@Injectable()
export class TrainingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureTrainingOwned(trainingId: string, userId: string) {
    const training = await this.prisma.training.findFirst({
      where: { id: trainingId, userId },
    });

    if (!training) throw new NotFoundException('Training not found');
    return training;
  }

  private async ensureBlockOwned(blockId: string, userId: string) {
    const block = await this.prisma.block.findFirst({
      where: { id: blockId, userId },
      select: { id: true, estimatedDurationSec: true },
    });

    if (!block) throw new NotFoundException('Block not found');
    return block;
  }

  private async recalcTrainingDuration(trainingId: string) {
    const tBlocks = await this.prisma.trainingBlock.findMany({
      where: { trainingId },
      include: { block: { select: { estimatedDurationSec: true } } },
    });

    const total = tBlocks.reduce((acc, tb) => {
      const base = tb.customDurationSec ?? tb.block.estimatedDurationSec ?? 0;
      return acc + base;
    }, 0);

    await this.prisma.training.update({
      where: { id: trainingId },
      data: { totalDurationSec: total },
    });

    return total;
  }

  async create(userId: string, dto: CreateTrainingDto) {
    const training = await this.prisma.training.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        trainingType: dto.trainingType,
        level: dto.level,
        groupSizeMin: dto.groupSizeMin,
        groupSizeMax: dto.groupSizeMax,
        notes: dto.notes,
      },
    });

    return training;
  }

  async findAll(userId: string) {
    return this.prisma.training.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        blocks: {
          orderBy: { orderIndex: 'asc' },
          include: {
            block: true,
          },
        },
      },
    });
  }

  async findOne(trainingId: string, userId: string) {
    await this.ensureTrainingOwned(trainingId, userId);

    return this.prisma.training.findFirst({
      where: { id: trainingId, userId },
      include: {
        blocks: {
          orderBy: { orderIndex: 'asc' },
          include: {
            block: {
              include: {
                exercises: { orderBy: { orderIndex: 'asc' } },
              },
            },
          },
        },
      },
    });
  }

  async update(trainingId: string, userId: string, dto: UpdateTrainingDto) {
    await this.ensureTrainingOwned(trainingId, userId);

    return this.prisma.training.update({
      where: { id: trainingId },
      data: {
        title: dto.title,
        description: dto.description,
        trainingType: dto.trainingType,
        level: dto.level,
        groupSizeMin: dto.groupSizeMin,
        groupSizeMax: dto.groupSizeMax,
        notes: dto.notes,
      },
    });
  }

  async remove(trainingId: string, userId: string) {
    await this.ensureTrainingOwned(trainingId, userId);

    // Borra primero training_blocks para evitar FK issues
    await this.prisma.trainingBlock.deleteMany({ where: { trainingId } });
    await this.prisma.training.delete({ where: { id: trainingId } });

    return { success: true };
  }

  // --- TrainingBlocks ---

  async addBlock(
    trainingId: string,
    userId: string,
    dto: AddBlockToTrainingDto,
  ) {
    await this.ensureTrainingOwned(trainingId, userId);
    await this.ensureBlockOwned(dto.blockId, userId);

    let orderIndex = dto.orderIndex;
    if (orderIndex === undefined || orderIndex === null) {
      const count = await this.prisma.trainingBlock.count({
        where: { trainingId },
      });
      orderIndex = count;
    }

    const created = await this.prisma.trainingBlock.create({
      data: {
        trainingId,
        blockId: dto.blockId,
        orderIndex,
        customDurationSec: dto.customDurationSec,
        notes: dto.notes,
      },
    });

    await this.recalcTrainingDuration(trainingId);

    return created;
  }

  async removeBlock(
    trainingId: string,
    trainingBlockId: string,
    userId: string,
  ) {
    await this.ensureTrainingOwned(trainingId, userId);

    const tb = await this.prisma.trainingBlock.findFirst({
      where: { id: trainingBlockId, trainingId },
    });
    if (!tb) throw new NotFoundException('Training block not found');

    await this.prisma.trainingBlock.delete({ where: { id: trainingBlockId } });
    await this.recalcTrainingDuration(trainingId);

    return { success: true };
  }

  async reorderBlocks(
    trainingId: string,
    userId: string,
    dto: ReorderTrainingBlocksDto,
  ) {
    await this.ensureTrainingOwned(trainingId, userId);

    await this.prisma.$transaction(
      dto.order.map((item) =>
        this.prisma.trainingBlock.update({
          where: { id: item.trainingBlockId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    await this.recalcTrainingDuration(trainingId);

    return this.prisma.trainingBlock.findMany({
      where: { trainingId },
      orderBy: { orderIndex: 'asc' },
      include: { block: true },
    });
  }
}
