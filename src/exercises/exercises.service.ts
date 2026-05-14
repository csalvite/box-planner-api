import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { ReorderExercisesDto } from './dto/reorder-exercises.dto';
import { CreateBlockExerciseDto } from './dto/create-block-exercise.dto';
import { UpdateBlockExerciseDto } from './dto/update-block-exercise.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ListExercisesQueryDto } from './dto/list-exercises-query.dto';

const exerciseListInclude = {
  exerciseToTags: {
    include: {
      tag: true,
    },
  },
  exerciseToMaterials: {
    include: {
      material: true,
    },
  },
} satisfies Prisma.ExerciseInclude;

const exerciseDetailInclude = {
  ...exerciseListInclude,
  variants: true,
  compatibilities: {
    include: {
      relatedExercise: true,
    },
  },
} satisfies Prisma.ExerciseInclude;

type PrismaTransaction = Prisma.TransactionClient;

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

  async listLibraryExercises(
    organizationId: string,
    query: ListExercisesQueryDto,
  ) {
    const where = this.buildExerciseWhere(organizationId, query);
    const exercises = await this.prisma.exercise.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: exerciseListInclude,
    });

    return exercises.map((exercise) => this.serializeExercise(exercise));
  }

  async findLibraryExercise(id: string, organizationId: string) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id,
        OR: [{ isGlobal: true }, { organizationId }],
      },
      include: exerciseDetailInclude,
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    return this.serializeExercise(exercise);
  }

  async createLibraryExercise(
    userId: string,
    organizationId: string,
    dto: CreateExerciseDto,
  ) {
    const tagIds = await this.validateAccessibleTagIds(
      dto.tagIds,
      organizationId,
    );
    const materialIds = await this.validateAccessibleMaterialIds(
      dto.materialIds,
      organizationId,
    );

    const exercise = await this.prisma.$transaction(async (tx) => {
      const created = await tx.exercise.create({
        data: {
          organizationId,
          createdByProfileId: userId,
          name: dto.name,
          shortDescription: dto.shortDescription,
          detailedDescription: dto.detailedDescription,
          category: dto.category,
          mainGoal: dto.mainGoal,
          level: dto.level,
          averageDurationMinutes: dto.averageDurationMinutes,
          intensity: dto.intensity,
          recommendedGroupSize: dto.recommendedGroupSize,
          spaceRequired: dto.spaceRequired,
          requiresPartner: dto.requiresPartner ?? false,
          coachNotes: dto.coachNotes,
          isGlobal: false,
          isActive: true,
        },
      });

      await this.replaceExerciseRelations(tx, created.id, tagIds, materialIds);

      return created;
    });

    return this.getLibraryExerciseResponse(exercise.id, organizationId);
  }

  async updateLibraryExercise(
    id: string,
    organizationId: string,
    dto: UpdateExerciseDto,
  ) {
    await this.ensureEditableLibraryExercise(id, organizationId);

    const tagIds =
      dto.tagIds === undefined
        ? undefined
        : await this.validateAccessibleTagIds(dto.tagIds, organizationId);
    const materialIds =
      dto.materialIds === undefined
        ? undefined
        : await this.validateAccessibleMaterialIds(
            dto.materialIds,
            organizationId,
          );

    await this.prisma.$transaction(async (tx) => {
      await tx.exercise.update({
        where: { id },
        data: {
          name: dto.name,
          shortDescription: dto.shortDescription,
          detailedDescription: dto.detailedDescription,
          category: dto.category,
          mainGoal: dto.mainGoal,
          level: dto.level,
          averageDurationMinutes: dto.averageDurationMinutes,
          intensity: dto.intensity,
          recommendedGroupSize: dto.recommendedGroupSize,
          spaceRequired: dto.spaceRequired,
          requiresPartner: dto.requiresPartner,
          coachNotes: dto.coachNotes,
          isActive: dto.isActive,
        },
      });

      await this.replaceExerciseRelations(tx, id, tagIds, materialIds);
    });

    return this.getLibraryExerciseResponse(id, organizationId);
  }

  async softDeleteLibraryExercise(id: string, organizationId: string) {
    await this.ensureEditableLibraryExercise(id, organizationId);

    await this.prisma.exercise.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  async findAll(blockId: string, organizationId: string) {
    await this.ensureBlockExists(blockId, organizationId);

    return this.prisma.blockExercise.findMany({
      where: { blockId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async create(
    blockId: string,
    organizationId: string,
    dto: CreateBlockExerciseDto,
  ) {
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
    dto: UpdateBlockExerciseDto,
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

  private buildExerciseWhere(
    organizationId: string,
    query: ListExercisesQueryDto,
  ): Prisma.ExerciseWhereInput {
    const and: Prisma.ExerciseWhereInput[] = [
      { OR: [{ isGlobal: true }, { organizationId }] },
    ];

    if (query.search) {
      and.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          {
            shortDescription: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          {
            detailedDescription: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          { mainGoal: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.category) {
      and.push({ category: query.category });
    }

    if (query.level) {
      and.push({ level: query.level });
    }

    if (query.intensity) {
      and.push({ intensity: query.intensity });
    }

    if (query.requiresPartner !== undefined) {
      and.push({ requiresPartner: query.requiresPartner });
    }

    if (query.isGlobal !== undefined) {
      and.push({ isGlobal: query.isGlobal });
    }

    and.push({ isActive: query.isActive ?? true });

    if (query.tagIds?.length) {
      and.push({
        exerciseToTags: {
          some: {
            tagId: { in: this.uniqueIds(query.tagIds) },
          },
        },
      });
    }

    if (query.materialIds?.length) {
      and.push({
        exerciseToMaterials: {
          some: {
            materialId: { in: this.uniqueIds(query.materialIds) },
          },
        },
      });
    }

    return { AND: and };
  }

  private async ensureEditableLibraryExercise(
    id: string,
    organizationId: string,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      select: {
        organizationId: true,
        isGlobal: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    if (exercise.isGlobal) {
      throw new ForbiddenException('Global exercises cannot be modified');
    }

    if (exercise.organizationId !== organizationId) {
      throw new NotFoundException('Exercise not found');
    }
  }

  private async validateAccessibleTagIds(
    ids: string[] | undefined,
    organizationId: string,
    tx: PrismaTransaction | PrismaService = this.prisma,
  ) {
    const uniqueIds = this.uniqueIds(ids);

    if (!uniqueIds.length) {
      return [];
    }

    const tags = await tx.exerciseTag.findMany({
      where: {
        id: { in: uniqueIds },
        OR: [{ isGlobal: true }, { organizationId }],
      },
      select: { id: true },
    });

    if (tags.length !== uniqueIds.length) {
      throw new BadRequestException('Invalid tagIds');
    }

    return uniqueIds;
  }

  private async validateAccessibleMaterialIds(
    ids: string[] | undefined,
    organizationId: string,
    tx: PrismaTransaction | PrismaService = this.prisma,
  ) {
    const uniqueIds = this.uniqueIds(ids);

    if (!uniqueIds.length) {
      return [];
    }

    const materials = await tx.material.findMany({
      where: {
        id: { in: uniqueIds },
        OR: [{ isGlobal: true }, { organizationId }],
      },
      select: { id: true },
    });

    if (materials.length !== uniqueIds.length) {
      throw new BadRequestException('Invalid materialIds');
    }

    return uniqueIds;
  }

  private async replaceExerciseRelations(
    tx: PrismaTransaction,
    exerciseId: string,
    tagIds?: string[],
    materialIds?: string[],
  ) {
    if (tagIds !== undefined) {
      await tx.exerciseToTag.deleteMany({ where: { exerciseId } });

      if (tagIds.length) {
        await tx.exerciseToTag.createMany({
          data: tagIds.map((tagId) => ({ exerciseId, tagId })),
        });
      }
    }

    if (materialIds !== undefined) {
      await tx.exerciseToMaterial.deleteMany({ where: { exerciseId } });

      if (materialIds.length) {
        await tx.exerciseToMaterial.createMany({
          data: materialIds.map((materialId) => ({ exerciseId, materialId })),
        });
      }
    }
  }

  private async getLibraryExerciseResponse(
    id: string,
    organizationId: string,
  ) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id,
        OR: [{ isGlobal: true }, { organizationId }],
      },
      include: exerciseListInclude,
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    return this.serializeExercise(exercise);
  }

  private serializeExercise<
    T extends {
      exerciseToTags?: { tag: unknown }[];
      exerciseToMaterials?: { material: unknown }[];
    },
  >(exercise: T) {
    const { exerciseToTags, exerciseToMaterials, ...rest } = exercise;

    return {
      ...rest,
      tags: exerciseToTags?.map(({ tag }) => tag) ?? [],
      materials:
        exerciseToMaterials?.map(({ material }) => material) ?? [],
    };
  }

  private uniqueIds(ids: string[] | undefined) {
    return [...new Set(ids ?? [])];
  }
}
