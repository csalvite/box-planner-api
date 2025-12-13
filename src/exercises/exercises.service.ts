import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { ReorderExercisesDto } from './dto/reorder-exercises.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprobar que el bloque existe y pertenece al usuario (de momento userId fijo)
   */
  private async ensureBlockExists(blockId: string, userId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        id: blockId,
        userId,
      },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    return block;
  }

  /**
   * Recalcula la duración total del bloque en base a sus ejercicios
   */
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

  async findAll(blockId: string, userId: string) {
    await this.ensureBlockExists(blockId, userId);

    return this.prisma.blockExercise.findMany({
      where: { blockId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async create(blockId: string, userId: string, dto: CreateExerciseDto) {
    await this.ensureBlockExists(blockId, userId);

    // Si no se pasa orderIndex, lo ponemos al final
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
    userId: string,
    dto: UpdateExerciseDto,
  ) {
    await this.ensureBlockExists(blockId, userId);

    const existing = await this.prisma.blockExercise.findFirst({
      where: { id: exerciseId, blockId },
    });

    if (!existing) {
      throw new NotFoundException('Exercise not found');
    }

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

  async remove(blockId: string, exerciseId: string, userId: string) {
    await this.ensureBlockExists(blockId, userId);

    const existing = await this.prisma.blockExercise.findFirst({
      where: { id: exerciseId, blockId },
    });

    if (!existing) {
      throw new NotFoundException('Exercise not found');
    }

    await this.prisma.blockExercise.delete({
      where: { id: exerciseId },
    });

    await this.recalculateBlockDuration(blockId);

    return { success: true };
  }

  async reorder(blockId: string, userId: string, dto: ReorderExercisesDto) {
    await this.ensureBlockExists(blockId, userId);

    // Podemos usar una transacción
    await this.prisma.$transaction(
      dto.order.map((item) =>
        this.prisma.blockExercise.update({
          where: { id: item.exerciseId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    return this.prisma.blockExercise.findMany({
      where: { blockId },
      orderBy: { orderIndex: 'asc' },
    });
  }
}
