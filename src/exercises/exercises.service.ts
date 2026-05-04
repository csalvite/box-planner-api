import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { ReorderExercisesDto } from './dto/reorder-exercises.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureBlockExists(blockId: string, organizationId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        id: blockId,
        organizationId,
      },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    return block;
  }

  private async ensureExerciseExists(blockId: string, exerciseId: string) {
    const exercise = await this.prisma.blockExercise.findFirst({
      where: { id: exerciseId, blockId },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    return exercise;
  }

  private async recalculateBlockDuration(blockId: string) {
    const exercises = await this.prisma.blockExercise.findMany({
      where: { blockId },
    });

    const total = exercises.reduce((acc, ex) => {
      const dur = ex.durationSec ?? 0;
      const rest = ex.restSec ?? 0;
      return acc + dur + rest;
    }, 0);

    await this.prisma.block.update({
      where: { id: blockId },
      data: { estimatedDurationSec: total },
    });
  }

  async findAll(blockId: string, organizationId: string) {
    await this.ensureBlockExists(blockId, organizationId);

    return this.prisma.blockExercise.findMany({
      where: { blockId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async create(blockId: string, organizationId: string, dto: CreateExerciseDto) {
    await this.ensureBlockExists(blockId, organizationId);

    let orderIndex = dto.orderIndex;
    if (orderIndex === undefined || orderIndex === null) {
      const count = await this.prisma.blockExercise.count({
        where: { blockId },
      });
      orderIndex = count;
    }

    const exercise = await this.prisma.blockExercise.create({
      data: {
        blockId,
        name: dto.name,
        description: dto.description,
        durationSec: dto.durationSec,
        reps: dto.reps,
        restSec: dto.restSec ?? 0,
        orderIndex,
        targetArea: dto.targetArea,
        mediaId: dto.mediaId,
        notes: dto.notes,
      },
    });

    await this.recalculateBlockDuration(blockId);

    return exercise;
  }

  async update(
    blockId: string,
    exerciseId: string,
    organizationId: string,
    dto: UpdateExerciseDto,
  ) {
    await this.ensureBlockExists(blockId, organizationId);
    const existing = await this.ensureExerciseExists(blockId, exerciseId);

    const updated = await this.prisma.blockExercise.update({
      where: { id: exerciseId },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        durationSec: dto.durationSec ?? existing.durationSec,
        reps: dto.reps ?? existing.reps,
        restSec: dto.restSec === undefined ? existing.restSec : dto.restSec,
        orderIndex:
          dto.orderIndex === undefined ? existing.orderIndex : dto.orderIndex,
        targetArea: dto.targetArea ?? existing.targetArea,
        mediaId: dto.mediaId ?? existing.mediaId,
        notes: dto.notes ?? existing.notes,
      },
    });

    await this.recalculateBlockDuration(blockId);

    return updated;
  }

  async remove(blockId: string, exerciseId: string, organizationId: string) {
    await this.ensureBlockExists(blockId, organizationId);
    await this.ensureExerciseExists(blockId, exerciseId);

    await this.prisma.blockExercise.delete({
      where: { id: exerciseId },
    });

    await this.recalculateBlockDuration(blockId);

    return { success: true };
  }

  async reorder(
    blockId: string,
    organizationId: string,
    dto: ReorderExercisesDto,
  ) {
    await this.ensureBlockExists(blockId, organizationId);

    const exerciseIds = dto.order.map((item) => item.exerciseId);
    const uniqueExerciseIds = [...new Set(exerciseIds)];
    const existingExercises = await this.prisma.blockExercise.findMany({
      where: {
        blockId,
        id: { in: uniqueExerciseIds },
      },
      select: { id: true },
    });

    if (existingExercises.length !== uniqueExerciseIds.length) {
      throw new NotFoundException('Exercise not found');
    }

    await this.prisma.$transaction([
      ...dto.order.map((item, index) =>
        this.prisma.blockExercise.update({
          where: { id: item.exerciseId },
          data: { orderIndex: -1000000 - index },
        }),
      ),
      ...dto.order.map((item) =>
        this.prisma.blockExercise.update({
          where: { id: item.exerciseId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    ]);

    return this.prisma.blockExercise.findMany({
      where: { blockId },
      orderBy: { orderIndex: 'asc' },
    });
  }
}
