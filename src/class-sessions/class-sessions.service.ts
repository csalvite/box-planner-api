import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AttendanceStatus,
  ClassSessionStatus,
  OrganizationMember,
  OrganizationRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';

@Injectable()
export class ClassSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanRead(membership);

    const sessions = await this.prisma.classSession.findMany({
      where: { organizationId },
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

    const trainings = await this.prisma.training.findMany({
      where: {
        id: { in: [...new Set(sessions.map((session) => session.trainingId))] },
        organizationId,
      },
    });
    const trainingsById = new Map(
      trainings.map((training) => [training.id, training]),
    );

    return sessions.map(({ attendances, ...session }) => ({
      id: session.id,
      title: session.title,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      status: session.status,
      notes: session.notes,
      training: trainingsById.get(session.trainingId) ?? null,
      attendanceCount: attendances.length,
      hasCurrentUserAttendance: attendances.some(
        (attendance) => attendance.profileId === userId,
      ),
    }));
  }

  async create(
    userId: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: CreateClassSessionDto,
  ) {
    this.ensureCanManage(membership);
    await this.ensureTrainingExists(dto.trainingId, organizationId);

    return this.prisma.classSession.create({
      data: {
        organizationId,
        trainingId: dto.trainingId,
        coachId: dto.coachId ?? userId,
        title: dto.title,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        status: this.toPrismaStatus(dto.status),
        notes: dto.notes,
      },
    });
  }

  async findOne(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanRead(membership);
    const session = await this.prisma.classSession.findFirst({
      where: { id, organizationId },
      include: this.trainingTreeInclude(),
    });

    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    return session;
  }

  async update(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: UpdateClassSessionDto,
  ) {
    this.ensureCanManage(membership);
    await this.ensureClassSessionExists(id, organizationId);

    if (dto.trainingId) {
      await this.ensureTrainingExists(dto.trainingId, organizationId);
    }

    return this.prisma.classSession.update({
      where: { id },
      data: {
        trainingId: dto.trainingId,
        coachId: dto.coachId,
        title: dto.title,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        status:
          dto.status === undefined ? undefined : this.toPrismaStatus(dto.status),
        notes: dto.notes,
      },
    });
  }

  async remove(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanManage(membership);
    await this.ensureClassSessionExists(id, organizationId);

    return this.prisma.classSession.update({
      where: { id },
      data: { status: ClassSessionStatus.CANCELLED },
    });
  }

  async markAttendance(
    userId: string,
    id: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanRead(membership);
    await this.ensureClassSessionExists(id, organizationId);

    const attendance = await this.prisma.attendance.upsert({
      where: {
        classSessionId_profileId: {
          classSessionId: id,
          profileId: userId,
        },
      },
      update: { status: AttendanceStatus.ATTENDED },
      create: {
        organizationId,
        classSessionId: id,
        profileId: userId,
        status: AttendanceStatus.ATTENDED,
      },
    });

    return {
      attendance,
      attendanceCount: await this.countAttendances(id),
      hasCurrentUserAttendance: true,
    };
  }

  async removeAttendance(
    userId: string,
    id: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanRead(membership);
    await this.ensureClassSessionExists(id, organizationId);

    const attendance = await this.prisma.attendance.upsert({
      where: {
        classSessionId_profileId: {
          classSessionId: id,
          profileId: userId,
        },
      },
      update: { status: AttendanceStatus.MISSED },
      create: {
        organizationId,
        classSessionId: id,
        profileId: userId,
        status: AttendanceStatus.MISSED,
      },
    });

    return {
      attendance,
      attendanceCount: await this.countAttendances(id),
      hasCurrentUserAttendance: false,
    };
  }

  private ensureCanManage(membership: OrganizationMember) {
    const allowedRoles: OrganizationRole[] = [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.COACH,
    ];

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Class session access denied');
    }
  }

  private ensureCanRead(membership: OrganizationMember) {
    const allowedRoles: OrganizationRole[] = [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.COACH,
      OrganizationRole.VIEWER,
    ];

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Class session access denied');
    }
  }

  private async ensureTrainingExists(
    trainingId: string,
    organizationId: string,
  ) {
    const training = await this.prisma.training.findFirst({
      where: { id: trainingId, organizationId },
      select: { id: true },
    });

    if (!training) {
      throw new NotFoundException('Training not found');
    }

    return training;
  }

  private async ensureClassSessionExists(id: string, organizationId: string) {
    const session = await this.prisma.classSession.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    return session;
  }

  private countAttendances(classSessionId: string) {
    return this.prisma.attendance.count({
      where: {
        classSessionId,
        status: AttendanceStatus.ATTENDED,
      },
    });
  }

  private toPrismaStatus(status?: 'scheduled' | 'completed' | 'cancelled') {
    if (status === 'completed') {
      return ClassSessionStatus.COMPLETED;
    }

    if (status === 'cancelled') {
      return ClassSessionStatus.CANCELLED;
    }

    return ClassSessionStatus.SCHEDULED;
  }

  private trainingTreeInclude() {
    return {
      training: {
        include: {
          blocks: {
            orderBy: { orderIndex: 'asc' as const },
            include: {
              block: {
                include: {
                  exercises: { orderBy: { orderIndex: 'asc' as const } },
                },
              },
            },
          },
        },
      },
      coach: true,
      attendances: true,
    };
  }
}
