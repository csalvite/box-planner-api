import { Test, TestingModule } from '@nestjs/testing';
import { BlocksService } from './blocks.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BlocksService', () => {
  let service: BlocksService;

  const prismaMock = {
    block: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocksService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<BlocksService>(BlocksService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a block when it exists and belongs to the user', async () => {
    const block = {
      id: 'block-1',
      userId: 'user-1',
      name: 'Warm Up',
      category: null,
      exercises: [],
    };

    prismaMock.block.findFirst.mockResolvedValue(block);

    const result = await service.findOne('block-1', 'user-1');

    expect(prismaMock.block.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'block-1',
        userId: 'user-1',
      },
      include: {
        category: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    expect(result).toEqual(block);
  });

  it('should throw NotFoundException when the block does not exist', async () => {
    prismaMock.block.findFirst.mockResolvedValue(null);

    await expect(service.findOne('block-1', 'user-1')).rejects.toThrow(
      'Block not found',
    );

    expect(prismaMock.block.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'block-1',
        userId: 'user-1',
      },
      include: {
        category: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  });

  it('should update a block when it exists and belongs to the user', async () => {
    const existingBlock = {
      id: 'block-1',
      userId: 'user-1',
      name: 'Old Name',
      category: null,
      exercises: [],
    };

    const dto = {
      name: 'New Name',
      description: 'Updated description',
      level: 'beginner',
      isPublic: true,
    };

    const updatedBlock = {
      id: 'block-1',
      userId: 'user-1',
      ...dto,
    };

    prismaMock.block.findFirst.mockResolvedValue(existingBlock);
    prismaMock.block.update.mockResolvedValue(updatedBlock);

    const result = await service.update('block-1', 'user-1', dto);

    expect(prismaMock.block.findFirst).toHaveBeenCalled();
    expect(prismaMock.block.update).toHaveBeenCalledWith({
      where: { id: 'block-1' },
      data: {
        name: 'New Name',
        description: 'Updated description',
        level: 'beginner',
        isPublic: true,
        category: undefined,
      },
    });

    expect(result).toEqual(updatedBlock);
  });

  it('should throw NotFoundException and not update when the block does not exist', async () => {
    prismaMock.block.findFirst.mockResolvedValue(null);

    const dto = {
      name: 'New Name',
      description: 'Updated description',
      level: 'beginner',
      isPublic: true,
    };

    await expect(service.update('block-1', 'user-1', dto)).rejects.toThrow(
      'Block not found',
    );

    expect(prismaMock.block.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'block-1',
        userId: 'user-1',
      },
      include: {
        category: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    expect(prismaMock.block.update).not.toHaveBeenCalled();
  });

  it('should remove a block when it exists and belongs to the user', async () => {
    const existingBlock = {
      id: 'block-1',
      userId: 'user-1',
      name: 'Old Name',
      category: null,
      exercises: [],
    };

    const deletedBlock = {
      id: 'block-1',
      userId: 'user-1',
    };

    prismaMock.block.findFirst.mockResolvedValue(existingBlock);
    prismaMock.block.delete.mockResolvedValue(deletedBlock);

    const result = await service.remove('block-1', 'user-1');

    expect(prismaMock.block.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'block-1',
        userId: 'user-1',
      },
      include: {
        category: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    expect(prismaMock.block.delete).toHaveBeenCalledWith({
      where: { id: 'block-1' },
    });

    expect(result).toEqual(deletedBlock);
  });

  it('should throw NotFoundException and not delete when the block does not exists', async () => {
    prismaMock.block.findFirst.mockResolvedValue(null);

    await expect(service.remove('block-1', 'user-1')).rejects.toThrow(
      'Block not found',
    );

    expect(prismaMock.block.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'block-1',
        userId: 'user-1',
      },
      include: {
        category: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    expect(prismaMock.block.delete).not.toHaveBeenCalled();
  });
});
