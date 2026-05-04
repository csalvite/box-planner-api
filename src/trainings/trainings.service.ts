import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { AddBlockToTrainingDto } from './dto/add-block-to-training.dto';
import { ReorderTrainingBlocksDto } from './dto/reorder-training-blocks.dto';

@Injectable()
export class TrainingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureTrainingExists(
    trainingId: string,
    organizationId: string,
  ) {
    const training = await this.prisma.training.findFirst({
      where: { id: trainingId, organizationId },
    });

    if (!training) {
      throw new NotFoundException('Training not found');
    }

    return training;
  }

  private async ensureBlockExists(blockId: string, organizationId: string) {
    const block = await this.prisma.block.findFirst({
      where: { id: blockId, organizationId },
      select: { id: true, estimatedDurationSec: true },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    return block;
  }

  private async ensureTrainingBlockExists(
    trainingId: string,
    trainingBlockId: string,
  ) {
    const trainingBlock = await this.prisma.trainingBlock.findFirst({
      where: { id: trainingBlockId, trainingId },
    });

    if (!trainingBlock) {
      throw new NotFoundException('Training block not found');
    }

    return trainingBlock;
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

  async create(
    userId: string,
    organizationId: string,
    dto: CreateTrainingDto,
  ) {
    return this.prisma.training.create({
      data: {
        organizationId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        trainingType: this.toPrismaTrainingType(dto.trainingType),
        level: dto.level,
        groupSizeMin: dto.groupSizeMin,
        groupSizeMax: dto.groupSizeMax,
        notes: dto.notes,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.training.findMany({
      where: { organizationId },
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

  async findOne(trainingId: string, organizationId: string) {
    const training = await this.prisma.training.findFirst({
      where: { id: trainingId, organizationId },
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

    if (!training) {
      throw new NotFoundException('Training not found');
    }

    return training;
  }

  async update(
    trainingId: string,
    organizationId: string,
    dto: UpdateTrainingDto,
  ) {
    await this.ensureTrainingExists(trainingId, organizationId);

    return this.prisma.training.update({
      where: { id: trainingId, organizationId },
      data: {
        title: dto.title,
        description: dto.description,
        trainingType: dto.trainingType
          ? this.toPrismaTrainingType(dto.trainingType)
          : undefined,
        level: dto.level,
        groupSizeMin: dto.groupSizeMin,
        groupSizeMax: dto.groupSizeMax,
        notes: dto.notes,
      },
    });
  }

  async remove(trainingId: string, organizationId: string) {
    await this.ensureTrainingExists(trainingId, organizationId);

    await this.prisma.trainingBlock.deleteMany({ where: { trainingId } });
    await this.prisma.training.delete({
      where: { id: trainingId, organizationId },
    });

    return { success: true };
  }

  async addBlock(
    trainingId: string,
    organizationId: string,
    dto: AddBlockToTrainingDto,
  ) {
    await this.ensureTrainingExists(trainingId, organizationId);
    await this.ensureBlockExists(dto.blockId, organizationId);

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
    organizationId: string,
  ) {
    await this.ensureTrainingExists(trainingId, organizationId);
    await this.ensureTrainingBlockExists(trainingId, trainingBlockId);

    await this.prisma.trainingBlock.delete({ where: { id: trainingBlockId } });
    await this.recalcTrainingDuration(trainingId);

    return { success: true };
  }

  async reorderBlocks(
    trainingId: string,
    organizationId: string,
    dto: ReorderTrainingBlocksDto,
  ) {
    await this.ensureTrainingExists(trainingId, organizationId);

    const trainingBlockIds = dto.order.map((item) => item.trainingBlockId);
    const uniqueTrainingBlockIds = [...new Set(trainingBlockIds)];
    const existingTrainingBlocks = await this.prisma.trainingBlock.findMany({
      where: {
        trainingId,
        id: { in: uniqueTrainingBlockIds },
      },
      select: { id: true },
    });

    if (existingTrainingBlocks.length !== uniqueTrainingBlockIds.length) {
      throw new NotFoundException('Training block not found');
    }

    await this.prisma.$transaction([
      ...dto.order.map((item, index) =>
        this.prisma.trainingBlock.update({
          where: { id: item.trainingBlockId },
          data: { orderIndex: -1000000 - index },
        }),
      ),
      ...dto.order.map((item) =>
        this.prisma.trainingBlock.update({
          where: { id: item.trainingBlockId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    ]);

    await this.recalcTrainingDuration(trainingId);

    return this.prisma.trainingBlock.findMany({
      where: { trainingId },
      orderBy: { orderIndex: 'asc' },
      include: { block: true },
    });
  }

  private toPrismaTrainingType(type: 'personal' | 'group') {
    return type === 'personal' ? TrainingType.PERSONAL : TrainingType.GROUP;
  }
}
