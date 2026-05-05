import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { BlockCategoriesService } from './block-categories.service';

describe('BlockCategoriesService', () => {
  let service: BlockCategoriesService;

  const prismaMock = {
    blockCategory: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockCategoriesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<BlockCategoriesService>(BlockCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return block categories ordered by id asc', async () => {
    const categories = [
      { id: 1, key: 'warm-up', name: 'Warm-up' },
      { id: 2, key: 'technique', name: 'Technique' },
    ];

    prismaMock.blockCategory.findMany.mockResolvedValue(categories);

    const result = await service.findAll();

    expect(prismaMock.blockCategory.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual(categories);
  });
});
