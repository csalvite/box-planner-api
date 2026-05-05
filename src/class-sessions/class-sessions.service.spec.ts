import { Test, TestingModule } from '@nestjs/testing';
import { ClassSessionStatus, MemberStatus, OrganizationRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClassSessionsService } from './class-sessions.service';

describe('ClassSessionsService', () => {
  let service: ClassSessionsService;

  const prismaMock = {
    classSession: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    training: {
      findFirst: jest.fn(),
    },
    attendance: {
      deleteMany: jest.fn(),
    },
  };

  const coachMembership = {
    id: 'membership-1',
    organizationId: 'org-1',
    profileId: 'user-1',
    role: OrganizationRole.COACH,
    status: MemberStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassSessionsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ClassSessionsService>(ClassSessionsService);
  });

  it('should list class sessions for manageable organization members', async () => {
    const sessions = [{ id: 'session-1', organizationId: 'org-1' }];
    prismaMock.classSession.findMany.mockResolvedValue(sessions);

    const result = await service.findAll('org-1', coachMembership);

    expect(prismaMock.classSession.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: { startsAt: 'asc' },
      include: {
        training: true,
        coach: true,
        _count: {
          select: { attendances: true },
        },
      },
    });
    expect(result).toEqual(sessions);
  });

  it('should create a class session after validating the training organization', async () => {
    const dto = {
      trainingId: 'training-1',
      startsAt: '2026-05-06T10:00:00.000Z',
      endsAt: '2026-05-06T11:00:00.000Z',
      title: 'Morning class',
      status: 'scheduled' as const,
      notes: 'Bring wraps',
    };
    const created = { id: 'session-1', ...dto };

    prismaMock.training.findFirst.mockResolvedValue({ id: 'training-1' });
    prismaMock.classSession.create.mockResolvedValue(created);

    const result = await service.create(
      'user-1',
      'org-1',
      coachMembership,
      dto,
    );

    expect(prismaMock.training.findFirst).toHaveBeenCalledWith({
      where: { id: 'training-1', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(prismaMock.classSession.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        trainingId: 'training-1',
        coachId: 'user-1',
        title: 'Morning class',
        startsAt: new Date('2026-05-06T10:00:00.000Z'),
        endsAt: new Date('2026-05-06T11:00:00.000Z'),
        status: ClassSessionStatus.SCHEDULED,
        notes: 'Bring wraps',
      },
    });
    expect(result).toEqual(created);
  });

  it('should reject viewers from managing class sessions', async () => {
    const viewerMembership = {
      ...coachMembership,
      role: OrganizationRole.VIEWER,
    };

    await expect(
      service.findAll('org-1', viewerMembership),
    ).rejects.toThrow('Class session access denied');

    expect(prismaMock.classSession.findMany).not.toHaveBeenCalled();
  });
});
