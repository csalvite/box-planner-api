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
      findMany: jest.fn(),
    },
    attendance: {
      upsert: jest.fn(),
      count: jest.fn(),
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
  const ownerMembership = {
    ...coachMembership,
    id: 'membership-owner',
    profileId: 'owner-1',
    role: OrganizationRole.OWNER,
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

  it('should let owners list created class sessions with training and attendance count', async () => {
    const startsAt = new Date('2026-05-06T10:00:00.000Z');
    const endsAt = new Date('2026-05-06T11:00:00.000Z');
    const sessions = [
      {
        id: 'session-1',
        organizationId: 'org-1',
        trainingId: 'training-1',
        coachId: 'coach-1',
        title: 'Morning class',
        startsAt,
        endsAt,
        status: ClassSessionStatus.SCHEDULED,
        notes: 'Bring wraps',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        coach: { id: 'coach-1' },
        attendances: [
          { profileId: 'owner-1' },
          { profileId: 'student-2' },
        ],
      },
    ];
    const training = { id: 'training-1', title: 'Basics' };
    prismaMock.classSession.findMany.mockResolvedValue(sessions);
    prismaMock.training.findMany.mockResolvedValue([training]);

    const result = await service.findAll('owner-1', 'org-1', ownerMembership);

    expect(prismaMock.classSession.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        organizationId: true,
        trainingId: true,
        coachId: true,
        title: true,
        startsAt: true,
        endsAt: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        coach: true,
        attendances: {
          where: { status: AttendanceStatus.ATTENDED },
          select: { profileId: true },
        },
      },
    });
    expect(prismaMock.training.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['training-1'] },
        organizationId: 'org-1',
      },
    });
    expect(result).toEqual([
      {
        id: 'session-1',
        title: 'Morning class',
        startsAt,
        endsAt,
        status: ClassSessionStatus.SCHEDULED,
        notes: 'Bring wraps',
        training,
        attendanceCount: 2,
        hasCurrentUserAttendance: true,
      },
    ]);
  });

  it('should return class sessions with null training when training is missing', async () => {
    prismaMock.classSession.findMany.mockResolvedValue([
      {
        id: 'session-1',
        organizationId: 'org-1',
        trainingId: 'missing-training',
        coachId: null,
        title: null,
        startsAt: new Date('2026-05-06T10:00:00.000Z'),
        endsAt: null,
        status: ClassSessionStatus.SCHEDULED,
        notes: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        coach: null,
        attendances: [],
      },
    ]);
    prismaMock.training.findMany.mockResolvedValue([]);

    const result = await service.findAll('user-1', 'org-1', coachMembership);

    expect(result[0]).toEqual({
      id: 'session-1',
      title: null,
      startsAt: new Date('2026-05-06T10:00:00.000Z'),
      endsAt: null,
      status: ClassSessionStatus.SCHEDULED,
      notes: null,
      training: null,
      attendanceCount: 0,
      hasCurrentUserAttendance: false,
    });
  });

  it('should return class sessions with null training when trainingId is null', async () => {
    const startsAt = new Date('2026-05-06T10:00:00.000Z');
    prismaMock.classSession.findMany.mockResolvedValue([
      {
        id: 'session-1',
        organizationId: 'org-1',
        trainingId: null,
        coachId: null,
        title: 'Open mat',
        startsAt,
        endsAt: null,
        status: ClassSessionStatus.SCHEDULED,
        notes: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        coach: null,
        attendances: [],
      },
    ]);
    prismaMock.training.findMany.mockResolvedValue([]);

    const result = await service.findAll('user-1', 'org-1', coachMembership);

    expect(prismaMock.training.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [] },
        organizationId: 'org-1',
      },
    });
    expect(result[0]).toEqual({
      id: 'session-1',
      title: 'Open mat',
      startsAt,
      endsAt: null,
      status: ClassSessionStatus.SCHEDULED,
      notes: null,
      training: null,
      attendanceCount: 0,
      hasCurrentUserAttendance: false,
    });
  });

  it('should create a class session after validating the training organization', async () => {
    const dto = {
      trainingId: 'training-1',
      startsAt: '2026-05-06T10:00:00.000Z',
      endsAt: '2026-05-06T11:00:00.000Z',
      title: 'Morning class',
      status: ClassSessionStatus.SCHEDULED,
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

  it('should let coaches create class sessions without trainingId', async () => {
    const dto = {
      startsAt: '2026-05-06T10:00:00.000Z',
      title: 'Open mat',
    };
    const created = { id: 'session-1', ...dto, trainingId: null };

    prismaMock.classSession.create.mockResolvedValue(created);

    const result = await service.create(
      'user-1',
      'org-1',
      coachMembership,
      dto,
    );

    expect(prismaMock.training.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.classSession.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        trainingId: null,
        coachId: 'user-1',
        title: 'Open mat',
        startsAt: new Date('2026-05-06T10:00:00.000Z'),
        endsAt: undefined,
        status: ClassSessionStatus.SCHEDULED,
        notes: undefined,
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
        status: ClassSessionStatus.COMPLETED,
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

  it('should assign trainingId to a class session without training', async () => {
    prismaMock.classSession.findFirst.mockResolvedValue({ id: 'session-1' });
    prismaMock.training.findFirst.mockResolvedValue({ id: 'training-1' });
    prismaMock.classSession.update.mockResolvedValue({
      id: 'session-1',
      trainingId: 'training-1',
    });

    const result = await service.update(
      'session-1',
      'org-1',
      coachMembership,
      {
        trainingId: 'training-1',
      },
    );

    expect(prismaMock.training.findFirst).toHaveBeenCalledWith({
      where: { id: 'training-1', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(prismaMock.classSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        trainingId: 'training-1',
        coachId: undefined,
        title: undefined,
        startsAt: undefined,
        endsAt: undefined,
        status: undefined,
        notes: undefined,
      },
    });
    expect(result).toEqual({
      id: 'session-1',
      trainingId: 'training-1',
    });
  });

  it('should change trainingId on a class session', async () => {
    prismaMock.classSession.findFirst.mockResolvedValue({ id: 'session-1' });
    prismaMock.training.findFirst.mockResolvedValue({ id: 'training-2' });
    prismaMock.classSession.update.mockResolvedValue({
      id: 'session-1',
      trainingId: 'training-2',
    });

    const result = await service.update(
      'session-1',
      'org-1',
      coachMembership,
      {
        trainingId: 'training-2',
      },
    );

    expect(prismaMock.training.findFirst).toHaveBeenCalledWith({
      where: { id: 'training-2', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(prismaMock.classSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        trainingId: 'training-2',
        coachId: undefined,
        title: undefined,
        startsAt: undefined,
        endsAt: undefined,
        status: undefined,
        notes: undefined,
      },
    });
    expect(result).toEqual({
      id: 'session-1',
      trainingId: 'training-2',
    });
  });

  it('should remove trainingId from a class session', async () => {
    prismaMock.classSession.findFirst.mockResolvedValue({ id: 'session-1' });
    prismaMock.classSession.update.mockResolvedValue({
      id: 'session-1',
      trainingId: null,
    });

    const result = await service.update(
      'session-1',
      'org-1',
      coachMembership,
      {
        trainingId: null,
      },
    );

    expect(prismaMock.training.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.classSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        trainingId: null,
        coachId: undefined,
        title: undefined,
        startsAt: undefined,
        endsAt: undefined,
        status: undefined,
        notes: undefined,
      },
    });
    expect(result).toEqual({
      id: 'session-1',
      trainingId: null,
    });
  });

  it('should reject trainingId from another organization', async () => {
    prismaMock.classSession.findFirst.mockResolvedValue({ id: 'session-1' });
    prismaMock.training.findFirst.mockResolvedValue(null);

    await expect(
      service.update('session-1', 'org-1', coachMembership, {
        trainingId: 'training-other-org',
      }),
    ).rejects.toThrow('Training not found');

    expect(prismaMock.training.findFirst).toHaveBeenCalledWith({
      where: { id: 'training-other-org', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(prismaMock.classSession.update).not.toHaveBeenCalled();
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
      organizationId: 'org-1',
      classSessionId: 'session-1',
      profileId: 'student-1',
      status: AttendanceStatus.ATTENDED,
    };

    prismaMock.classSession.findFirst.mockResolvedValue({ id: 'session-1' });
    prismaMock.attendance.upsert.mockResolvedValue(attendance);
    prismaMock.attendance.count.mockResolvedValue(1);

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
      update: { status: AttendanceStatus.ATTENDED },
      create: {
        organizationId: 'org-1',
        classSessionId: 'session-1',
        profileId: 'student-1',
        status: AttendanceStatus.ATTENDED,
      },
    });
    expect(prismaMock.attendance.count).toHaveBeenCalledWith({
      where: {
        classSessionId: 'session-1',
        status: AttendanceStatus.ATTENDED,
      },
    });
    expect(result).toEqual({
      attendance,
      attendanceCount: 1,
      hasCurrentUserAttendance: true,
    });
  });

  it('should not duplicate attendance when students confirm twice', async () => {
    const viewerMembership = {
      ...coachMembership,
      profileId: 'student-1',
      role: OrganizationRole.VIEWER,
    };
    const attendance = {
      id: 'attendance-1',
      organizationId: 'org-1',
      classSessionId: 'session-1',
      profileId: 'student-1',
      status: AttendanceStatus.ATTENDED,
    };

    prismaMock.classSession.findFirst.mockResolvedValue({ id: 'session-1' });
    prismaMock.attendance.upsert.mockResolvedValue(attendance);
    prismaMock.attendance.count.mockResolvedValue(1);

    await service.markAttendance(
      'student-1',
      'session-1',
      'org-1',
      viewerMembership,
    );
    const result = await service.markAttendance(
      'student-1',
      'session-1',
      'org-1',
      viewerMembership,
    );

    expect(prismaMock.attendance.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.attendance.upsert).toHaveBeenCalledWith({
      where: {
        classSessionId_profileId: {
          classSessionId: 'session-1',
          profileId: 'student-1',
        },
      },
      update: { status: AttendanceStatus.ATTENDED },
      create: {
        organizationId: 'org-1',
        classSessionId: 'session-1',
        profileId: 'student-1',
        status: AttendanceStatus.ATTENDED,
      },
    });
    expect(result).toEqual({
      attendance,
      attendanceCount: 1,
      hasCurrentUserAttendance: true,
    });
  });
});
