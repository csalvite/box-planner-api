import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
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

  async findAll(organizationId: string, membership: OrganizationMember) {
    this.ensureCanRead(membership);

    return this.prisma.classSession.findMany({
      where: { organizationId },
      orderBy: { startsAt: 'asc' },
      include: {
        training: true,
        coach: true,
        _count: {
          select: { attendances: true },
        },
      },
    });
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

    await this.prisma.attendance.deleteMany({
      where: { classSessionId: id },
    });
    await this.prisma.classSession.delete({
      where: { id },
    });

    return { success: true };
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
