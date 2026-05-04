import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    profile: {
      upsert: jest.fn(),
    },
    organizationMember: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a profile when resolving me if it does not exist', async () => {
    const profile = {
      id: 'user-1',
      email: 'trainer@example.com',
    };

    prismaMock.profile.upsert.mockResolvedValue(profile);
    prismaMock.organizationMember.findMany.mockResolvedValue([]);

    const result = await service.getMe({
      id: 'user-1',
      email: 'trainer@example.com',
    });

    expect(prismaMock.profile.upsert).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      update: { email: 'trainer@example.com' },
      create: { id: 'user-1', email: 'trainer@example.com' },
    });
    expect(result).toEqual({
      id: 'user-1',
      email: 'trainer@example.com',
      profile,
      memberships: [],
    });
  });
});
