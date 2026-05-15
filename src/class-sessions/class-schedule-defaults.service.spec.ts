import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MemberStatus, OrganizationRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClassScheduleDefaultsService } from './class-schedule-defaults.service';

describe('ClassScheduleDefaultsService', () => {
  let service: ClassScheduleDefaultsService;

  const prismaMock = {
    classScheduleDefault: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    organizationMember: {
      findFirst: jest.fn(),
    },
  };

  const coachMembership = {
    id: 'membership-1',
    organizationId: 'org-1',
    profileId: 'coach-1',
    role: OrganizationRole.COACH,
    status: MemberStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassScheduleDefaultsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ClassScheduleDefaultsService>(
      ClassScheduleDefaultsService,
    );
  });

  it('should list organization schedule defaults as time strings', async () => {
    prismaMock.classScheduleDefault.findMany.mockResolvedValue([
      {
        id: 'schedule-default-1',
        organizationId: 'org-1',
        coachId: null,
        weekday: 2,
        startsAtTime: new Date('1970-01-01T21:00:00.000Z'),
        endsAtTime: new Date('1970-01-01T22:00:00.000Z'),
        label: 'Tuesday night',
        isActive: true,
      },
    ]);

    const result = await service.findAll('org-1', coachMembership);

    expect(prismaMock.classScheduleDefault.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: [{ weekday: 'asc' }, { startsAtTime: 'asc' }],
    });
    expect(result).toEqual([
      {
        id: 'schedule-default-1',
        organizationId: 'org-1',
        coachId: null,
        weekday: 2,
        startsAtTime: '21:00:00',
        endsAtTime: '22:00:00',
        label: 'Tuesday night',
        isActive: true,
      },
    ]);
  });

  it('should create a coach-specific schedule default', async () => {
    prismaMock.organizationMember.findFirst.mockResolvedValue({
      id: 'membership-coach-2',
    });
    prismaMock.classScheduleDefault.create.mockResolvedValue({
      id: 'schedule-default-1',
      organizationId: 'org-1',
      coachId: 'coach-2',
      weekday: 5,
      startsAtTime: new Date('1970-01-01T21:15:00.000Z'),
      endsAtTime: new Date('1970-01-01T22:15:00.000Z'),
      label: 'Friday night',
      isActive: true,
    });

    const result = await service.create('org-1', coachMembership, {
      coachId: 'coach-2',
      weekday: 5,
      startsAtTime: '21:15',
      endsAtTime: '22:15',
      label: 'Friday night',
      isActive: true,
    });

    expect(prismaMock.organizationMember.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        profileId: 'coach-2',
        status: MemberStatus.ACTIVE,
      },
      select: { id: true },
    });
    expect(prismaMock.classScheduleDefault.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        coachId: 'coach-2',
        weekday: 5,
        startsAtTime: new Date('1970-01-01T21:15:00.000Z'),
        endsAtTime: new Date('1970-01-01T22:15:00.000Z'),
        label: 'Friday night',
        isActive: true,
      },
    });
    expect(result.startsAtTime).toBe('21:15:00');
    expect(result.endsAtTime).toBe('22:15:00');
  });

  it('should reject schedule defaults where end time is not later', async () => {
    await expect(
      service.create('org-1', coachMembership, {
        weekday: 2,
        startsAtTime: '22:00',
        endsAtTime: '21:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.classScheduleDefault.create).not.toHaveBeenCalled();
  });

  it('should reject coach ids outside the organization', async () => {
    prismaMock.organizationMember.findFirst.mockResolvedValue(null);

    await expect(
      service.create('org-1', coachMembership, {
        coachId: 'coach-2',
        weekday: 2,
        startsAtTime: '21:00',
        endsAtTime: '22:00',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.classScheduleDefault.create).not.toHaveBeenCalled();
  });
});
