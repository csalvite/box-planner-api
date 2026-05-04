import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ExercisesService } from './exercises.service';

describe('ExercisesService', () => {
  let service: ExercisesService;

  const prismaMock = {
    block: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    blockExercise: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ExercisesService>(ExercisesService);

    jest.clearAllMocks();
    prismaMock.block.findFirst.mockResolvedValue({
      id: 'block-1',
      organizationId: 'org-1',
    });
    prismaMock.$transaction.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list exercises after validating the block organization', async () => {
    const exercises = [{ id: 'exercise-1', blockId: 'block-1' }];
    prismaMock.blockExercise.findMany.mockResolvedValue(exercises);

    const result = await service.findAll('block-1', 'org-1');

    expect(prismaMock.block.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'block-1',
        organizationId: 'org-1',
      },
    });
    expect(prismaMock.blockExercise.findMany).toHaveBeenCalledWith({
      where: { blockId: 'block-1' },
      orderBy: { orderIndex: 'asc' },
    });
    expect(result).toEqual(exercises);
  });

  it('should throw NotFoundException when the block is outside the organization', async () => {
    prismaMock.block.findFirst.mockResolvedValue(null);

    await expect(service.findAll('block-1', 'org-1')).rejects.toThrow(
      'Block not found',
    );

    expect(prismaMock.blockExercise.findMany).not.toHaveBeenCalled();
  });

  it('should create an exercise and recalculate block duration', async () => {
    const dto = {
      name: 'Jab cross',
      durationSec: 30,
    };
    const createdExercise = {
      id: 'exercise-1',
      blockId: 'block-1',
      name: 'Jab cross',
      durationSec: 30,
      restSec: 0,
      orderIndex: 2,
    };

    prismaMock.blockExercise.count.mockResolvedValue(2);
    prismaMock.blockExercise.create.mockResolvedValue(createdExercise);
    prismaMock.blockExercise.findMany.mockResolvedValue([
      { durationSec: 30, restSec: 10 },
      { durationSec: 20, restSec: null },
    ]);

    const result = await service.create('block-1', 'org-1', dto);

    expect(prismaMock.blockExercise.create).toHaveBeenCalledWith({
      data: {
        blockId: 'block-1',
        name: 'Jab cross',
        description: undefined,
        durationSec: 30,
        reps: undefined,
        restSec: 0,
        orderIndex: 2,
        targetArea: undefined,
        mediaId: undefined,
        notes: undefined,
      },
    });
    expect(prismaMock.block.update).toHaveBeenCalledWith({
      where: { id: 'block-1' },
      data: { estimatedDurationSec: 60 },
    });
    expect(result).toEqual(createdExercise);
  });

  it('should update an exercise that belongs to the block', async () => {
    const existingExercise = {
      id: 'exercise-1',
      blockId: 'block-1',
      name: 'Old',
      description: null,
      durationSec: 20,
      reps: null,
      restSec: 5,
      orderIndex: 0,
      targetArea: null,
      mediaId: null,
      notes: null,
    };
    const updatedExercise = {
      ...existingExercise,
      name: 'New',
      restSec: 0,
    };

    prismaMock.blockExercise.findFirst.mockResolvedValue(existingExercise);
    prismaMock.blockExercise.update.mockResolvedValue(updatedExercise);
    prismaMock.blockExercise.findMany.mockResolvedValue([
      { durationSec: 20, restSec: 0 },
    ]);

    const result = await service.update('block-1', 'exercise-1', 'org-1', {
      name: 'New',
      restSec: 0,
    });

    expect(prismaMock.blockExercise.findFirst).toHaveBeenCalledWith({
      where: { id: 'exercise-1', blockId: 'block-1' },
    });
    expect(prismaMock.blockExercise.update).toHaveBeenCalledWith({
      where: { id: 'exercise-1' },
      data: {
        name: 'New',
        description: null,
        durationSec: 20,
        reps: null,
        restSec: 0,
        orderIndex: 0,
        targetArea: null,
        mediaId: null,
        notes: null,
      },
    });
    expect(prismaMock.block.update).toHaveBeenCalledWith({
      where: { id: 'block-1' },
      data: { estimatedDurationSec: 20 },
    });
    expect(result).toEqual(updatedExercise);
  });

  it('should not update an exercise from another block', async () => {
    prismaMock.blockExercise.findFirst.mockResolvedValue(null);

    await expect(
      service.update('block-1', 'exercise-1', 'org-1', { name: 'New' }),
    ).rejects.toThrow('Exercise not found');

    expect(prismaMock.blockExercise.update).not.toHaveBeenCalled();
    expect(prismaMock.block.update).not.toHaveBeenCalled();
  });

  it('should remove an exercise that belongs to the block', async () => {
    prismaMock.blockExercise.findFirst.mockResolvedValue({
      id: 'exercise-1',
      blockId: 'block-1',
    });
    prismaMock.blockExercise.findMany.mockResolvedValue([]);

    const result = await service.remove('block-1', 'exercise-1', 'org-1');

    expect(prismaMock.blockExercise.delete).toHaveBeenCalledWith({
      where: { id: 'exercise-1' },
    });
    expect(prismaMock.block.update).toHaveBeenCalledWith({
      where: { id: 'block-1' },
      data: { estimatedDurationSec: 0 },
    });
    expect(result).toEqual({ success: true });
  });

  it('should reorder a swap safely when all exercises belong to the block', async () => {
    const reorderedExercises = [
      { id: 'exercise-2', blockId: 'block-1', orderIndex: 0 },
      { id: 'exercise-1', blockId: 'block-1', orderIndex: 1 },
    ];

    prismaMock.blockExercise.findMany
      .mockResolvedValueOnce([{ id: 'exercise-1' }, { id: 'exercise-2' }])
      .mockResolvedValueOnce(reorderedExercises);

    const result = await service.reorder('block-1', 'org-1', {
      order: [
        { exerciseId: 'exercise-2', orderIndex: 0 },
        { exerciseId: 'exercise-1', orderIndex: 1 },
      ],
    });

    expect(prismaMock.blockExercise.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        blockId: 'block-1',
        id: { in: ['exercise-2', 'exercise-1'] },
      },
      select: { id: true },
    });
    expect(prismaMock.$transaction.mock.calls[0][0]).toHaveLength(4);
    expect(prismaMock.blockExercise.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'exercise-2' },
      data: { orderIndex: -1000000 },
    });
    expect(prismaMock.blockExercise.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'exercise-1' },
      data: { orderIndex: -1000001 },
    });
    expect(prismaMock.blockExercise.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'exercise-2' },
      data: { orderIndex: 0 },
    });
    expect(prismaMock.blockExercise.update).toHaveBeenNthCalledWith(4, {
      where: { id: 'exercise-1' },
      data: { orderIndex: 1 },
    });
    expect(result).toEqual(reorderedExercises);
  });

  it('should not reorder when any exercise is outside the block', async () => {
    prismaMock.blockExercise.findMany.mockResolvedValueOnce([
      { id: 'exercise-1' },
    ]);

    await expect(
      service.reorder('block-1', 'org-1', {
        order: [
          { exerciseId: 'exercise-1', orderIndex: 0 },
          { exerciseId: 'exercise-2', orderIndex: 1 },
        ],
      }),
    ).rejects.toThrow('Exercise not found');

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.blockExercise.update).not.toHaveBeenCalled();
  });
});
