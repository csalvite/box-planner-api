import { Test, TestingModule } from '@nestjs/testing';
import {
  AttendanceStatus,
  ClassSessionStatus,
  MemberStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentService } from './student.service';

describe('StudentService', () => {
  let service: StudentService;

  const prismaMock = {
    organizationMember: {
      findMany: jest.fn(),
    },
    classSession: {
      findFirst: jest.fn(),
    },
    attendance: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
  });

  it('should return the next scheduled session with training content', async () => {
    const session = {
      id: 'session-1',
      organizationId: 'org-1',
      organization: { id: 'org-1', name: 'Box Gym' },
      training: {
        id: 'training-1',
        blocks: [
          {
            id: 'training-block-1',
            orderIndex: 0,
            block: {
              id: 'block-1',
              exercises: [{ id: 'exercise-1', orderIndex: 0 }],
            },
          },
        ],
      },
    };

    prismaMock.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'org-1' },
    ]);
    prismaMock.classSession.findFirst.mockResolvedValue(session);

    const result = await service.getNextSession('user-1');

    expect(prismaMock.organizationMember.findMany).toHaveBeenCalledWith({
      where: {
        profileId: 'user-1',
        status: MemberStatus.ACTIVE,
      },
      select: { organizationId: true },
    });
    expect(prismaMock.classSession.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: { in: ['org-1'] },
        startsAt: { gte: expect.any(Date) },
        status: ClassSessionStatus.SCHEDULED,
      },
      orderBy: { startsAt: 'asc' },
      include: {
        organization: true,
        training: {
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
        },
      },
    });
    expect(result).toEqual({
      session: {
        id: 'session-1',
        organizationId: 'org-1',
        organization: { id: 'org-1', name: 'Box Gym' },
      },
      training: session.training,
    });
  });

  it('should return empty next session state without active memberships', async () => {
    prismaMock.organizationMember.findMany.mockResolvedValue([]);

    const result = await service.getNextSession('user-1');

    expect(result).toEqual({ session: null, training: null });
    expect(prismaMock.classSession.findFirst).not.toHaveBeenCalled();
  });

  it('should calculate simple attendance stats', async () => {
    prismaMock.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'org-1' },
    ]);
    prismaMock.attendance.findMany.mockResolvedValue([
      { classSession: { startsAt: new Date('2026-05-02T10:00:00.000Z') } },
      { classSession: { startsAt: new Date('2026-05-05T10:00:00.000Z') } },
      { classSession: { startsAt: new Date('2026-05-04T10:00:00.000Z') } },
    ]);

    const result = await service.getStats('user-1');

    expect(prismaMock.attendance.findMany).toHaveBeenCalledWith({
      where: {
        profileId: 'user-1',
        status: AttendanceStatus.PRESENT,
        classSession: {
          organizationId: { in: ['org-1'] },
        },
      },
      include: {
        classSession: {
          select: { startsAt: true },
        },
      },
    });
    expect(result).toEqual({
      totalAttendances: 3,
      currentStreak: 2,
      lastAttendanceDate: new Date('2026-05-05T10:00:00.000Z'),
    });
  });
});
