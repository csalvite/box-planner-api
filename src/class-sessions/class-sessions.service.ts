import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  ClassSessionStatus,
  OrganizationMember,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { CreateClassSessionSectionDto } from './dto/create-class-session-section.dto';
import { CreateClassSessionSectionExerciseDto } from './dto/create-class-session-section-exercise.dto';
import {
  ClassSessionEnabledFilter,
  ClassSessionListStatus,
  ListClassSessionsDto,
} from './dto/list-class-sessions.dto';
import { ReorderClassSessionSectionExercisesDto } from './dto/reorder-class-session-section-exercises.dto';
import { ReorderClassSessionSectionsDto } from './dto/reorder-class-session-sections.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';
import { UpdateClassSessionSectionDto } from './dto/update-class-session-section.dto';
import { UpdateClassSessionSectionExerciseDto } from './dto/update-class-session-section-exercise.dto';
import { UpdateClassSessionStatusDto } from './dto/update-class-session-status.dto';

@Injectable()
export class ClassSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    organizationId: string,
    membership: OrganizationMember,
    query: ListClassSessionsDto = {},
  ) {
    this.ensureCanRead(membership);

    const where = this.buildFindAllWhere(organizationId, query);

    const sessions = await this.prisma.classSession.findMany({
      where,
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
        isEnabled: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        coach: true,
        attendances: {
          where: { status: AttendanceStatus.ATTENDED },
          select: { profileId: true },
        },
        sections: this.sectionsSelect(),
      },
    });

    const trainingIds = [
      ...new Set(
        sessions
          .map((session) => session.trainingId)
          .filter((trainingId): trainingId is string => trainingId !== null),
      ),
    ];

    const trainings = await this.prisma.training.findMany({
      where: {
        id: { in: trainingIds },
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
      isEnabled: session.isEnabled,
      notes: session.notes,
      training: session.trainingId
        ? (trainingsById.get(session.trainingId) ?? null)
        : null,
      sections: session.sections,
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

    if (dto.trainingId !== undefined && dto.trainingId !== null) {
      await this.ensureTrainingExists(dto.trainingId, organizationId);
    }

    return this.prisma.classSession.create({
      data: {
        organizationId,
        trainingId: dto.trainingId ?? null,
        coachId: dto.coachId ?? userId,
        title: dto.title ?? 'Clase',
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        status: this.toPrismaStatus(dto.status),
        isEnabled: dto.isEnabled,
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
      include: this.classSessionDetailInclude(),
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

    if (dto.trainingId !== undefined && dto.trainingId !== null) {
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
          dto.status === undefined
            ? undefined
            : this.toPrismaStatus(dto.status),
        isEnabled: dto.isEnabled,
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

  async updateStatus(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: UpdateClassSessionStatusDto,
  ) {
    this.ensureCanManage(membership);
    if (dto.status === undefined && dto.isEnabled === undefined) {
      throw new BadRequestException('Class session status update is empty');
    }
    await this.ensureClassSessionExists(id, organizationId);

    return this.prisma.classSession.update({
      where: { id },
      data: {
        status: dto.status,
        isEnabled: dto.isEnabled,
      },
    });
  }

  async hardDelete(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanManage(membership);
    await this.ensureClassSessionExists(id, organizationId);

    await this.prisma.$transaction([
      this.prisma.attendance.deleteMany({
        where: { classSessionId: id, organizationId },
      }),
      this.prisma.classSession.deleteMany({
        where: { id, organizationId },
      }),
    ]);

    return { id, deleted: true };
  }

  async createSection(
    classSessionId: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: CreateClassSessionSectionDto,
  ) {
    this.ensureCanManage(membership);
    await this.ensureClassSessionExists(classSessionId, organizationId);

    const orderIndex =
      dto.orderIndex ??
      (await this.prisma.classSessionSection.count({
        where: { classSessionId, organizationId },
      }));

    return this.prisma.classSessionSection.create({
      data: {
        organizationId,
        classSessionId,
        name: dto.name,
        objective: dto.objective,
        estimatedDurationMinutes: dto.estimatedDurationMinutes,
        orderIndex,
        notes: dto.notes,
      },
      include: this.sectionInclude(),
    });
  }

  async updateSection(
    sectionId: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: UpdateClassSessionSectionDto,
  ) {
    this.ensureCanManage(membership);
    await this.ensureSectionExists(sectionId, organizationId);

    return this.prisma.classSessionSection.update({
      where: { id: sectionId },
      data: {
        name: dto.name,
        objective: dto.objective,
        estimatedDurationMinutes: dto.estimatedDurationMinutes,
        orderIndex: dto.orderIndex,
        notes: dto.notes,
      },
      include: this.sectionInclude(),
    });
  }

  async removeSection(
    sectionId: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanManage(membership);
    await this.ensureSectionExists(sectionId, organizationId);

    await this.prisma.classSessionSection.deleteMany({
      where: { id: sectionId, organizationId },
    });

    return { success: true };
  }

  async reorderSections(
    classSessionId: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: ReorderClassSessionSectionsDto,
  ) {
    this.ensureCanManage(membership);
    await this.ensureClassSessionExists(classSessionId, organizationId);

    const sectionIds = dto.order.map((item) => item.sectionId);
    const uniqueSectionIds = [...new Set(sectionIds)];
    const existingSections = await this.prisma.classSessionSection.findMany({
      where: {
        classSessionId,
        organizationId,
        id: { in: uniqueSectionIds },
      },
      select: { id: true },
    });

    if (existingSections.length !== uniqueSectionIds.length) {
      throw new NotFoundException('Class session section not found');
    }

    await this.prisma.$transaction([
      ...dto.order.map((item, index) =>
        this.prisma.classSessionSection.update({
          where: { id: item.sectionId },
          data: { orderIndex: -1000000 - index },
        }),
      ),
      ...dto.order.map((item) =>
        this.prisma.classSessionSection.update({
          where: { id: item.sectionId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    ]);

    return this.prisma.classSessionSection.findMany({
      where: { classSessionId, organizationId },
      orderBy: { orderIndex: 'asc' },
      include: this.sectionInclude(),
    });
  }

  async createSectionExercise(
    sectionId: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: CreateClassSessionSectionExerciseDto,
  ) {
    this.ensureCanManage(membership);
    await this.ensureSectionExists(sectionId, organizationId);
    const libraryExercise = dto.exerciseId
      ? await this.ensureAccessibleLibraryExercise(
          dto.exerciseId,
          organizationId,
        )
      : null;

    if (!libraryExercise && !dto.name) {
      throw new BadRequestException('Exercise name is required');
    }

    const orderIndex =
      dto.orderIndex ??
      (await this.prisma.classSessionSectionExercise.count({
        where: { sectionId, organizationId },
      }));

    return this.prisma.classSessionSectionExercise.create({
      data: {
        organizationId,
        sectionId,
        exerciseId: libraryExercise?.id ?? null,
        name: dto.name ?? libraryExercise?.name ?? '',
        description:
          dto.description ??
          libraryExercise?.detailedDescription ??
          libraryExercise?.shortDescription,
        durationSec:
          dto.durationSec ??
          this.minutesToSeconds(libraryExercise?.averageDurationMinutes),
        reps: dto.reps,
        restSec: dto.restSec,
        orderIndex,
        notes: dto.notes,
      },
      include: { libraryExercise: true },
    });
  }

  async updateSectionExercise(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: UpdateClassSessionSectionExerciseDto,
  ) {
    this.ensureCanManage(membership);
    const existing = await this.ensureSectionExerciseExists(id, organizationId);
    const libraryExercise =
      dto.exerciseId === undefined
        ? undefined
        : dto.exerciseId
          ? await this.ensureAccessibleLibraryExercise(
              dto.exerciseId,
              organizationId,
            )
          : null;

    return this.prisma.classSessionSectionExercise.update({
      where: { id },
      data: {
        exerciseId:
          dto.exerciseId === undefined
            ? existing.exerciseId
            : (libraryExercise?.id ?? null),
        name: dto.name ?? libraryExercise?.name ?? existing.name,
        description:
          dto.description ??
          libraryExercise?.detailedDescription ??
          libraryExercise?.shortDescription ??
          existing.description,
        durationSec:
          dto.durationSec ??
          this.minutesToSeconds(libraryExercise?.averageDurationMinutes) ??
          existing.durationSec,
        reps: dto.reps ?? existing.reps,
        restSec: dto.restSec === undefined ? existing.restSec : dto.restSec,
        orderIndex:
          dto.orderIndex === undefined ? existing.orderIndex : dto.orderIndex,
        notes: dto.notes ?? existing.notes,
      },
      include: { libraryExercise: true },
    });
  }

  async removeSectionExercise(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanManage(membership);
    await this.ensureSectionExerciseExists(id, organizationId);

    await this.prisma.classSessionSectionExercise.deleteMany({
      where: { id, organizationId },
    });

    return { success: true };
  }

  async reorderSectionExercises(
    sectionId: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: ReorderClassSessionSectionExercisesDto,
  ) {
    this.ensureCanManage(membership);
    await this.ensureSectionExists(sectionId, organizationId);

    const exerciseIds = dto.order.map((item) => item.exerciseId);
    const uniqueExerciseIds = [...new Set(exerciseIds)];
    const existingExercises =
      await this.prisma.classSessionSectionExercise.findMany({
        where: {
          sectionId,
          organizationId,
          id: { in: uniqueExerciseIds },
        },
        select: { id: true },
      });

    if (existingExercises.length !== uniqueExerciseIds.length) {
      throw new NotFoundException('Class session section exercise not found');
    }

    await this.prisma.$transaction([
      ...dto.order.map((item, index) =>
        this.prisma.classSessionSectionExercise.update({
          where: { id: item.exerciseId },
          data: { orderIndex: -1000000 - index },
        }),
      ),
      ...dto.order.map((item) =>
        this.prisma.classSessionSectionExercise.update({
          where: { id: item.exerciseId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    ]);

    return this.prisma.classSessionSectionExercise.findMany({
      where: { sectionId, organizationId },
      orderBy: { orderIndex: 'asc' },
      include: { libraryExercise: true },
    });
  }

  async markAttendance(
    userId: string,
    id: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanRead(membership);
    await this.ensureClassSessionIsBookable(id, organizationId);

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

  private async ensureSectionExists(id: string, organizationId: string) {
    const section = await this.prisma.classSessionSection.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        classSessionId: true,
        organizationId: true,
        classSession: {
          select: { organizationId: true },
        },
      },
    });

    if (!section || section.classSession.organizationId !== organizationId) {
      throw new NotFoundException('Class session section not found');
    }

    return section;
  }

  private async ensureSectionExerciseExists(
    id: string,
    organizationId: string,
  ) {
    const exercise = await this.prisma.classSessionSectionExercise.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        sectionId: true,
        exerciseId: true,
        name: true,
        description: true,
        durationSec: true,
        reps: true,
        restSec: true,
        orderIndex: true,
        notes: true,
        section: {
          select: {
            organizationId: true,
            classSession: {
              select: { organizationId: true },
            },
          },
        },
      },
    });

    if (
      !exercise ||
      exercise.section.organizationId !== organizationId ||
      exercise.section.classSession.organizationId !== organizationId
    ) {
      throw new NotFoundException('Class session section exercise not found');
    }

    return exercise;
  }

  private async ensureAccessibleLibraryExercise(
    id: string,
    organizationId: string,
  ) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id,
        OR: [{ isGlobal: true }, { organizationId }],
      },
      select: {
        id: true,
        name: true,
        shortDescription: true,
        detailedDescription: true,
        averageDurationMinutes: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    return exercise;
  }

  private async ensureClassSessionIsBookable(
    id: string,
    organizationId: string,
  ) {
    const session = await this.prisma.classSession.findFirst({
      where: { id, organizationId },
      select: { id: true, status: true, isEnabled: true },
    });

    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    if (session.status !== ClassSessionStatus.SCHEDULED || !session.isEnabled) {
      throw new BadRequestException('Class session is not bookable');
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

  private toPrismaStatus(status?: ClassSessionStatus) {
    return status ?? ClassSessionStatus.SCHEDULED;
  }

  private buildFindAllWhere(
    organizationId: string,
    query: ListClassSessionsDto,
  ): Prisma.ClassSessionWhereInput {
    const where: Prisma.ClassSessionWhereInput = { organizationId };

    if (query.status && query.status !== ClassSessionListStatus.ALL) {
      where.status = query.status;
    }

    if (query.enabled === ClassSessionEnabledFilter.TRUE) {
      where.isEnabled = true;
    } else if (query.enabled === ClassSessionEnabledFilter.FALSE) {
      where.isEnabled = false;
    }

    if (query.trainingId) {
      where.trainingId = query.trainingId;
    }

    if (query.from || query.to) {
      where.startsAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const search = query.search?.trim();
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    return where;
  }

  private classSessionDetailInclude() {
    return {
      training: {
        include: {
          blocks: {
            orderBy: { orderIndex: 'asc' as const },
            include: {
              block: {
                include: {
                  exercises: {
                    orderBy: { orderIndex: 'asc' as const },
                    include: { libraryExercise: true },
                  },
                },
              },
            },
          },
        },
      },
      coach: true,
      attendances: true,
      sections: this.sectionsSelect(),
    };
  }

  private sectionInclude() {
    return {
      exercises: {
        orderBy: { orderIndex: 'asc' as const },
        include: { libraryExercise: true },
      },
    };
  }

  private sectionsSelect() {
    return {
      orderBy: { orderIndex: 'asc' as const },
      include: this.sectionInclude(),
    };
  }

  private minutesToSeconds(minutes: number | null | undefined) {
    return minutes === null || minutes === undefined ? undefined : minutes * 60;
  }
}
