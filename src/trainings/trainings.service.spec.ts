import { Test, TestingModule } from '@nestjs/testing';
import { TrainingType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingsService } from './trainings.service';

describe('TrainingsService', () => {
  let service: TrainingsService;

  const prismaMock = {
    training: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    block: {
      findFirst: jest.fn(),
    },
    trainingBlock: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<TrainingsService>(TrainingsService);

    jest.clearAllMocks();
    prismaMock.training.findFirst.mockResolvedValue({
      id: 'training-1',
      organizationId: 'org-1',
    });
    prismaMock.block.findFirst.mockResolvedValue({
      id: 'block-1',
      estimatedDurationSec: 120,
    });
    prismaMock.$transaction.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a training in the explicit organization', async () => {
    const dto = {
      title: 'Monday class',
      description: 'Basics',
      trainingType: 'group' as const,
      level: 'beginner',
      groupSizeMin: 4,
      groupSizeMax: 10,
      notes: 'Bring wraps',
    };
    const createdTraining = {
      id: 'training-1',
      organizationId: 'org-1',
      createdById: 'user-1',
      ...dto,
      trainingType: TrainingType.GROUP,
    };

    prismaMock.training.create.mockResolvedValue(createdTraining);

    const result = await service.create('user-1', 'org-1', dto);

    expect(prismaMock.training.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        createdById: 'user-1',
        title: 'Monday class',
        description: 'Basics',
        trainingType: TrainingType.GROUP,
        level: 'beginner',
        groupSizeMin: 4,
        groupSizeMax: 10,
        notes: 'Bring wraps',
      },
    });
    expect(result).toEqual(createdTraining);
  });

  it('should list trainings from the explicit organization', async () => {
    const trainings = [{ id: 'training-1', organizationId: 'org-1' }];
    prismaMock.training.findMany.mockResolvedValue(trainings);

    const result = await service.findAll('org-1');

    expect(prismaMock.training.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
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
    expect(result).toEqual(trainings);
  });

  it('should return a training when it exists in the organization', async () => {
    const training = {
      id: 'training-1',
      organizationId: 'org-1',
      blocks: [],
    };
    prismaMock.training.findFirst.mockResolvedValue(training);

    const result = await service.findOne('training-1', 'org-1');

    expect(prismaMock.training.findFirst).toHaveBeenCalledWith({
      where: { id: 'training-1', organizationId: 'org-1' },
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
    expect(result).toEqual(training);
  });

  it('should throw NotFoundException when the training is outside the organization', async () => {
    prismaMock.training.findFirst.mockResolvedValue(null);

    await expect(service.findOne('training-1', 'org-1')).rejects.toThrow(
      'Training not found',
    );
  });

  it('should update a training after validating organization', async () => {
    const updatedTraining = {
      id: 'training-1',
      organizationId: 'org-1',
      title: 'Updated',
      trainingType: TrainingType.PERSONAL,
    };

    prismaMock.training.update.mockResolvedValue(updatedTraining);

    const result = await service.update('training-1', 'org-1', {
      title: 'Updated',
      trainingType: 'personal',
    });

    expect(prismaMock.training.findFirst).toHaveBeenCalledWith({
      where: { id: 'training-1', organizationId: 'org-1' },
    });
    expect(prismaMock.training.update).toHaveBeenCalledWith({
      where: { id: 'training-1', organizationId: 'org-1' },
      data: {
        title: 'Updated',
        description: undefined,
        trainingType: TrainingType.PERSONAL,
        level: undefined,
        groupSizeMin: undefined,
        groupSizeMax: undefined,
        notes: undefined,
      },
    });
    expect(result).toEqual(updatedTraining);
  });

  it('should remove a training after validating organization', async () => {
    const result = await service.remove('training-1', 'org-1');

    expect(prismaMock.trainingBlock.deleteMany).toHaveBeenCalledWith({
      where: { trainingId: 'training-1' },
    });
    expect(prismaMock.training.delete).toHaveBeenCalledWith({
      where: { id: 'training-1', organizationId: 'org-1' },
    });
    expect(result).toEqual({ success: true });
  });

  it('should add an organization block to an organization training and recalculate duration', async () => {
    const createdTrainingBlock = {
      id: 'training-block-1',
      trainingId: 'training-1',
      blockId: 'block-1',
      orderIndex: 2,
    };

    prismaMock.trainingBlock.count.mockResolvedValue(2);
    prismaMock.trainingBlock.create.mockResolvedValue(createdTrainingBlock);
    prismaMock.trainingBlock.findMany.mockResolvedValue([
      {
        customDurationSec: null,
        block: { estimatedDurationSec: 120 },
      },
      {
        customDurationSec: 60,
        block: { estimatedDurationSec: 90 },
      },
    ]);

    const result = await service.addBlock('training-1', 'org-1', {
      blockId: 'block-1',
    });

    expect(prismaMock.block.findFirst).toHaveBeenCalledWith({
      where: { id: 'block-1', organizationId: 'org-1' },
      select: { id: true, estimatedDurationSec: true },
    });
    expect(prismaMock.trainingBlock.create).toHaveBeenCalledWith({
      data: {
        trainingId: 'training-1',
        blockId: 'block-1',
        orderIndex: 2,
        customDurationSec: undefined,
        notes: undefined,
      },
    });
    expect(prismaMock.training.update).toHaveBeenCalledWith({
      where: { id: 'training-1' },
      data: { totalDurationSec: 180 },
    });
    expect(result).toEqual(createdTrainingBlock);
  });

  it('should not add a block from another organization', async () => {
    prismaMock.block.findFirst.mockResolvedValue(null);

    await expect(
      service.addBlock('training-1', 'org-1', { blockId: 'block-1' }),
    ).rejects.toThrow('Block not found');

    expect(prismaMock.trainingBlock.create).not.toHaveBeenCalled();
    expect(prismaMock.training.update).not.toHaveBeenCalled();
  });

  it('should remove a training block that belongs to the training', async () => {
    prismaMock.trainingBlock.findFirst.mockResolvedValue({
      id: 'training-block-1',
      trainingId: 'training-1',
    });
    prismaMock.trainingBlock.findMany.mockResolvedValue([]);

    const result = await service.removeBlock(
      'training-1',
      'training-block-1',
      'org-1',
    );

    expect(prismaMock.trainingBlock.findFirst).toHaveBeenCalledWith({
      where: { id: 'training-block-1', trainingId: 'training-1' },
    });
    expect(prismaMock.trainingBlock.delete).toHaveBeenCalledWith({
      where: { id: 'training-block-1' },
    });
    expect(prismaMock.training.update).toHaveBeenCalledWith({
      where: { id: 'training-1' },
      data: { totalDurationSec: 0 },
    });
    expect(result).toEqual({ success: true });
  });

  it('should not remove a training block from another training', async () => {
    prismaMock.trainingBlock.findFirst.mockResolvedValue(null);

    await expect(
      service.removeBlock('training-1', 'training-block-1', 'org-1'),
    ).rejects.toThrow('Training block not found');

    expect(prismaMock.trainingBlock.delete).not.toHaveBeenCalled();
    expect(prismaMock.training.update).not.toHaveBeenCalled();
  });

  it('should reorder a swap safely when all training blocks belong to the training', async () => {
    const reordered = [
      { id: 'training-block-2', trainingId: 'training-1', orderIndex: 0 },
      { id: 'training-block-1', trainingId: 'training-1', orderIndex: 1 },
    ];

    prismaMock.trainingBlock.findMany
      .mockResolvedValueOnce([
        { id: 'training-block-1' },
        { id: 'training-block-2' },
      ])
      .mockResolvedValueOnce([
        {
          customDurationSec: null,
          block: { estimatedDurationSec: 30 },
        },
      ])
      .mockResolvedValueOnce(reordered);

    const result = await service.reorderBlocks('training-1', 'org-1', {
      order: [
        { trainingBlockId: 'training-block-2', orderIndex: 0 },
        { trainingBlockId: 'training-block-1', orderIndex: 1 },
      ],
    });

    expect(prismaMock.trainingBlock.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        trainingId: 'training-1',
        id: { in: ['training-block-2', 'training-block-1'] },
      },
      select: { id: true },
    });
    expect(prismaMock.$transaction.mock.calls[0][0]).toHaveLength(4);
    expect(prismaMock.trainingBlock.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'training-block-2' },
      data: { orderIndex: -1000000 },
    });
    expect(prismaMock.trainingBlock.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'training-block-1' },
      data: { orderIndex: -1000001 },
    });
    expect(prismaMock.trainingBlock.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'training-block-2' },
      data: { orderIndex: 0 },
    });
    expect(prismaMock.trainingBlock.update).toHaveBeenNthCalledWith(4, {
      where: { id: 'training-block-1' },
      data: { orderIndex: 1 },
    });
    expect(prismaMock.training.update).toHaveBeenCalledWith({
      where: { id: 'training-1' },
      data: { totalDurationSec: 30 },
    });
    expect(result).toEqual(reordered);
  });

  it('should not reorder when any training block is outside the training', async () => {
    prismaMock.trainingBlock.findMany.mockResolvedValueOnce([
      { id: 'training-block-1' },
    ]);

    await expect(
      service.reorderBlocks('training-1', 'org-1', {
        order: [
          { trainingBlockId: 'training-block-1', orderIndex: 0 },
          { trainingBlockId: 'training-block-2', orderIndex: 1 },
        ],
      }),
    ).rejects.toThrow('Training block not found');

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.trainingBlock.update).not.toHaveBeenCalled();
    expect(prismaMock.training.update).not.toHaveBeenCalled();
  });
});
