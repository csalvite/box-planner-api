import { Test, TestingModule } from '@nestjs/testing';
import {
  AttendanceStatus,
  ClassSessionStatus,
  MemberStatus,
  OrganizationRole,
} from '@prisma/client';
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
    },
    training: {
      findFirst: jest.fn(),
    },
    attendance: {
      upsert: jest.fn(),
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
    const sessions = [
      {
        id: 'session-1',
        organizationId: 'org-1',
        attendances: [
          { profileId: 'user-1' },
          { profileId: 'student-2' },
        ],
      },
    ];
    prismaMock.classSession.findMany.mockResolvedValue(sessions);

    const result = await service.findAll('user-1', 'org-1', coachMembership);

    expect(prismaMock.classSession.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: { startsAt: 'asc' },
      include: {
        training: true,
        coach: true,
        attendances: {
          where: { status: AttendanceStatus.PRESENT },
          select: { profileId: true },
        },
      },
    });
    expect(result).toEqual([
      {
        id: 'session-1',
        organizationId: 'org-1',
        attendanceCount: 2,
        hasCurrentUserAttendance: true,
      },
    ]);
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

  it('should reject viewers from creating class sessions', async () => {
    const viewerMembership = {
      ...coachMembership,
      role: OrganizationRole.VIEWER,
    };

    await expect(
      service.create('user-1', 'org-1', viewerMembership, {
        trainingId: 'training-1',
        startsAt: '2026-05-06T10:00:00.000Z',
        title: 'Morning class',
      }),
    ).rejects.toThrow('Class session access denied');

    expect(prismaMock.classSession.create).not.toHaveBeenCalled();
  });

  it('should update a class session after validating organization', async () => {
    prismaMock.classSession.findFirst.mockResolvedValue({ id: 'session-1' });
    prismaMock.classSession.update.mockResolvedValue({
      id: 'session-1',
      title: 'Updated class',
      status: ClassSessionStatus.COMPLETED,
    });

    const result = await service.update(
      'session-1',
      'org-1',
      coachMembership,
      {
        title: 'Updated class',
        status: 'completed',
      },
    );

    expect(prismaMock.classSession.findFirst).toHaveBeenCalledWith({
      where: { id: 'session-1', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(prismaMock.classSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        trainingId: undefined,
        coachId: undefined,
        title: 'Updated class',
        startsAt: undefined,
        endsAt: undefined,
        status: ClassSessionStatus.COMPLETED,
        notes: undefined,
      },
    });
    expect(result).toEqual({
      id: 'session-1',
      title: 'Updated class',
      status: ClassSessionStatus.COMPLETED,
    });
  });

  it('should cancel a class session instead of deleting it', async () => {
    prismaMock.classSession.findFirst.mockResolvedValue({ id: 'session-1' });
    prismaMock.classSession.update.mockResolvedValue({
      id: 'session-1',
      status: ClassSessionStatus.CANCELLED,
    });

    const result = await service.remove(
      'session-1',
      'org-1',
      coachMembership,
    );

    expect(prismaMock.classSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { status: ClassSessionStatus.CANCELLED },
    });
    expect(result).toEqual({
      id: 'session-1',
      status: ClassSessionStatus.CANCELLED,
    });
  });

  it('should let students mark attendance for an organization class', async () => {
    const viewerMembership = {
      ...coachMembership,
      profileId: 'student-1',
      role: OrganizationRole.VIEWER,
    };
    const attendance = {
      id: 'attendance-1',
      classSessionId: 'session-1',
      profileId: 'student-1',
      status: AttendanceStatus.PRESENT,
    };

    prismaMock.classSession.findFirst.mockResolvedValue({ id: 'session-1' });
    prismaMock.attendance.upsert.mockResolvedValue(attendance);

    const result = await service.markAttendance(
      'student-1',
      'session-1',
      'org-1',
      viewerMembership,
    );

    expect(prismaMock.classSession.findFirst).toHaveBeenCalledWith({
      where: { id: 'session-1', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(prismaMock.attendance.upsert).toHaveBeenCalledWith({
      where: {
        classSessionId_profileId: {
          classSessionId: 'session-1',
          profileId: 'student-1',
        },
      },
      update: { status: AttendanceStatus.PRESENT },
      create: {
        classSessionId: 'session-1',
        profileId: 'student-1',
        status: AttendanceStatus.PRESENT,
      },
    });
    expect(result).toEqual(attendance);
  });
});
