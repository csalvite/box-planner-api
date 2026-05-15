import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  ClassSessionStatus,
  MemberStatus,
  OrganizationMember,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { CreateClassSessionSectionDto } from './dto/create-class-session-section.dto';
import { CreateClassSessionSectionExerciseDto } from './dto/create-class-session-section-exercise.dto';
import { FullClassSessionPlanDto } from './dto/full-class-session-plan.dto';
import {
  ClassSessionEnabledFilter,
  ClassSessionListStatus,
  ListClassSessionsDto,
} from './dto/list-class-sessions.dto';
import { ReorderClassSessionSectionExercisesDto } from './dto/reorder-class-session-section-exercises.dto';
import { ReorderClassSessionSectionsDto } from './dto/reorder-class-session-sections.dto';
import { ScheduleClassSessionFromDefaultDto } from './dto/schedule-class-session-from-default.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';
import { UpdateClassSessionSectionDto } from './dto/update-class-session-section.dto';
import { UpdateClassSessionSectionExerciseDto } from './dto/update-class-session-section-exercise.dto';
import { UpdateClassSessionStatusDto } from './dto/update-class-session-status.dto';

type FullPlanSection = FullClassSessionPlanDto['sections'][number];
type FullPlanExercise = FullPlanSection['exercises'][number];
type LibraryExerciseSnapshot = {
  id: string;
  name: string;
  shortDescription: string | null;
  detailedDescription: string | null;
  averageDurationMinutes: number | null;
};

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
        targetDurationMinutes: true,
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
      targetDurationMinutes: session.targetDurationMinutes,
      estimatedDurationMinutes: this.calculateEstimatedDurationMinutes(
        session.sections,
      ),
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
        title: dto.title,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: this.toOptionalDateUpdate(dto.endsAt),
        targetDurationMinutes: dto.targetDurationMinutes,
        status: this.toCreateStatus(dto.status, dto.startsAt),
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

    return {
      ...session,
      estimatedDurationMinutes: this.calculateEstimatedDurationMinutes(
        session.sections,
      ),
    };
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
        startsAt: this.toOptionalDateUpdate(dto.startsAt),
        endsAt: this.toOptionalDateUpdate(dto.endsAt),
        targetDurationMinutes: dto.targetDurationMinutes,
        status:
          dto.status === undefined
            ? this.toUpdateStatus(dto.startsAt)
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

  async scheduleFromDefault(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: ScheduleClassSessionFromDefaultDto,
  ) {
    this.ensureCanManage(membership);
    await this.ensureClassSessionExists(id, organizationId);

    const scheduleDefault =
      await this.prisma.classScheduleDefault.findFirst({
        where: {
          id: dto.scheduleDefaultId,
          organizationId,
          isActive: true,
        },
      });

    if (!scheduleDefault) {
      throw new NotFoundException('Class schedule default not found');
    }

    const date = dto.date ?? this.nextDateForWeekday(scheduleDefault.weekday);
    if (this.weekdayFromDateString(date) !== scheduleDefault.weekday) {
      throw new BadRequestException('Date does not match schedule weekday');
    }

    await this.prisma.classSession.update({
      where: { id },
      data: {
        startsAt: this.combineDateAndTime(date, scheduleDefault.startsAtTime),
        endsAt: this.combineDateAndTime(date, scheduleDefault.endsAtTime),
        status: ClassSessionStatus.SCHEDULED,
      },
    });

    return this.findOne(id, organizationId, membership);
  }

  async scheduleFromDefaultForUser(
    userId: string,
    id: string,
    organizationId: string | undefined,
    dto: ScheduleClassSessionFromDefaultDto,
  ) {
    const membership = await this.ensureCanManageClassSessionForUser(
      userId,
      id,
      organizationId,
    );

    return this.scheduleFromDefault(id, membership.organizationId, membership, dto);
  }

  async saveFullPlan(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: FullClassSessionPlanDto,
  ) {
    this.ensureCanManage(membership);
    await this.ensureClassSessionExists(id, organizationId);

    this.ensureNoDuplicateIds(
      dto.sections
        .map((section) => section.id)
        .filter((sectionId): sectionId is string => sectionId !== undefined),
      'Duplicated class session section id',
    );

    for (const section of dto.sections) {
      this.ensureNoDuplicateIds(
        section.exercises
          .map((exercise) => exercise.id)
          .filter((exerciseId): exerciseId is string => exerciseId !== undefined),
        'Duplicated class session section exercise id',
      );
    }

    const existingSections = await this.prisma.classSessionSection.findMany({
      where: { classSessionId: id, organizationId },
      include: { exercises: true },
    });
    const existingSectionsById = new Map(
      existingSections.map((section) => [section.id, section]),
    );

    for (const section of dto.sections) {
      if (section.id && !existingSectionsById.has(section.id)) {
        throw new NotFoundException('Class session section not found');
      }

      const existingExercisesById = new Map(
        (section.id
          ? existingSectionsById.get(section.id)?.exercises
          : []
        )?.map((exercise) => [exercise.id, exercise]) ?? [],
      );

      for (const exercise of section.exercises) {
        if (exercise.id && !existingExercisesById.has(exercise.id)) {
          throw new NotFoundException(
            'Class session section exercise not found',
          );
        }
      }
    }

    const libraryExerciseIds = [
      ...new Set(
        dto.sections.flatMap((section) =>
          section.exercises
            .map((exercise) => exercise.exerciseId)
            .filter((exerciseId): exerciseId is string => Boolean(exerciseId)),
        ),
      ),
    ];
    const libraryExercises = await this.findAccessibleLibraryExercises(
      libraryExerciseIds,
      organizationId,
    );

    const savedSession = await this.prisma.$transaction(async (tx) => {
      await tx.classSession.update({
        where: { id },
        data: {
          title: dto.title,
          notes: dto.notes,
          targetDurationMinutes: dto.targetDurationMinutes,
          startsAt: this.toOptionalDateUpdate(dto.startsAt),
          endsAt: this.toOptionalDateUpdate(dto.endsAt),
          status:
            dto.status === undefined
              ? this.toUpdateStatus(dto.startsAt)
              : this.toPrismaStatus(dto.status),
        },
      });

      const payloadSectionIds = dto.sections
        .map((section) => section.id)
        .filter((sectionId): sectionId is string => sectionId !== undefined);

      await tx.classSessionSection.deleteMany({
        where: {
          classSessionId: id,
          organizationId,
          ...(payloadSectionIds.length > 0
            ? { id: { notIn: payloadSectionIds } }
            : {}),
        },
      });

      for (const [sectionIndex, section] of dto.sections.entries()) {
        const savedSection = section.id
          ? await tx.classSessionSection.update({
              where: { id: section.id },
              data: {
                name: section.name,
                objective: section.objective,
                estimatedDurationMinutes: section.estimatedDurationMinutes,
                orderIndex: section.orderIndex ?? sectionIndex,
                notes: section.notes,
              },
            })
          : await tx.classSessionSection.create({
              data: {
                organizationId,
                classSessionId: id,
                name: section.name,
                objective: section.objective,
                estimatedDurationMinutes: section.estimatedDurationMinutes,
                orderIndex: section.orderIndex ?? sectionIndex,
                notes: section.notes,
              },
            });

        await this.syncFullPlanSectionExercises(
          tx,
          organizationId,
          savedSection.id,
          section.exercises,
          existingSectionsById.get(section.id ?? '')?.exercises ?? [],
          libraryExercises,
        );
      }

      return tx.classSession.findFirst({
        where: { id, organizationId },
        include: this.classSessionDetailInclude(),
      });
    });

    if (!savedSession) {
      throw new NotFoundException('Class session not found');
    }

    return {
      ...savedSession,
      estimatedDurationMinutes: this.calculateEstimatedDurationMinutes(
        savedSession.sections,
      ),
    };
  }

  async saveFullPlanForUser(
    userId: string,
    id: string,
    organizationId: string | undefined,
    dto: FullClassSessionPlanDto,
  ) {
    const membership = await this.ensureCanManageClassSessionForUser(
      userId,
      id,
      organizationId,
    );

    return this.saveFullPlan(id, membership.organizationId, membership, dto);
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

  async createSectionForUser(
    userId: string,
    classSessionId: string,
    organizationId: string | undefined,
    dto: CreateClassSessionSectionDto,
  ) {
    const membership = await this.ensureCanManageClassSessionForUser(
      userId,
      classSessionId,
      organizationId,
    );

    return this.createSection(
      classSessionId,
      membership.organizationId,
      membership,
      dto,
    );
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

  async updateSectionForUser(
    userId: string,
    sectionId: string,
    organizationId: string | undefined,
    dto: UpdateClassSessionSectionDto,
  ) {
    const membership = await this.ensureCanManageSectionForUser(
      userId,
      sectionId,
      organizationId,
    );

    return this.updateSection(
      sectionId,
      membership.organizationId,
      membership,
      dto,
    );
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

  async removeSectionForUser(
    userId: string,
    sectionId: string,
    organizationId: string | undefined,
  ) {
    const membership = await this.ensureCanManageSectionForUser(
      userId,
      sectionId,
      organizationId,
    );

    return this.removeSection(sectionId, membership.organizationId, membership);
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

  async reorderSectionsForUser(
    userId: string,
    classSessionId: string,
    organizationId: string | undefined,
    dto: ReorderClassSessionSectionsDto,
  ) {
    const membership = await this.ensureCanManageClassSessionForUser(
      userId,
      classSessionId,
      organizationId,
    );

    return this.reorderSections(
      classSessionId,
      membership.organizationId,
      membership,
      dto,
    );
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

  async createSectionExerciseForUser(
    userId: string,
    sectionId: string,
    organizationId: string | undefined,
    dto: CreateClassSessionSectionExerciseDto,
  ) {
    const membership = await this.ensureCanManageSectionForUser(
      userId,
      sectionId,
      organizationId,
    );

    return this.createSectionExercise(
      sectionId,
      membership.organizationId,
      membership,
      dto,
    );
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

  async updateSectionExerciseForUser(
    userId: string,
    id: string,
    organizationId: string | undefined,
    dto: UpdateClassSessionSectionExerciseDto,
  ) {
    const membership = await this.ensureCanManageSectionExerciseForUser(
      userId,
      id,
      organizationId,
    );

    return this.updateSectionExercise(
      id,
      membership.organizationId,
      membership,
      dto,
    );
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

  async removeSectionExerciseForUser(
    userId: string,
    id: string,
    organizationId: string | undefined,
  ) {
    const membership = await this.ensureCanManageSectionExerciseForUser(
      userId,
      id,
      organizationId,
    );

    return this.removeSectionExercise(
      id,
      membership.organizationId,
      membership,
    );
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

  async reorderSectionExercisesForUser(
    userId: string,
    sectionId: string,
    organizationId: string | undefined,
    dto: ReorderClassSessionSectionExercisesDto,
  ) {
    const membership = await this.ensureCanManageSectionForUser(
      userId,
      sectionId,
      organizationId,
    );

    return this.reorderSectionExercises(
      sectionId,
      membership.organizationId,
      membership,
      dto,
    );
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

  private async syncFullPlanSectionExercises(
    tx: Prisma.TransactionClient,
    organizationId: string,
    sectionId: string,
    exercises: FullPlanExercise[],
    existingExercises: Array<{
      id: string;
      exerciseId: string | null;
      name: string;
      description: string | null;
      durationSec: number | null;
      reps: number | null;
      restSec: number | null;
      orderIndex: number;
      notes: string | null;
    }>,
    libraryExercises: Map<string, LibraryExerciseSnapshot>,
  ) {
    const existingExercisesById = new Map(
      existingExercises.map((exercise) => [exercise.id, exercise]),
    );
    const payloadExerciseIds = exercises
      .map((exercise) => exercise.id)
      .filter((exerciseId): exerciseId is string => exerciseId !== undefined);

    await tx.classSessionSectionExercise.deleteMany({
      where: {
        sectionId,
        organizationId,
        ...(payloadExerciseIds.length > 0
          ? { id: { notIn: payloadExerciseIds } }
          : {}),
      },
    });

    for (const [exerciseIndex, exercise] of exercises.entries()) {
      const libraryExercise = exercise.exerciseId
        ? libraryExercises.get(exercise.exerciseId)
        : null;

      if (exercise.id) {
        const existingExercise = existingExercisesById.get(exercise.id);
        if (!existingExercise) {
          throw new NotFoundException(
            'Class session section exercise not found',
          );
        }

        await tx.classSessionSectionExercise.update({
          where: { id: exercise.id },
          data: {
            exerciseId: this.hasOwn(exercise, 'exerciseId')
              ? (libraryExercise?.id ?? null)
              : existingExercise.exerciseId,
            name: this.hasOwn(exercise, 'name')
              ? (exercise.name ?? existingExercise.name)
              : existingExercise.name,
            description: this.hasOwn(exercise, 'description')
              ? exercise.description
              : existingExercise.description,
            durationSec: this.hasOwn(exercise, 'durationSec')
              ? exercise.durationSec
              : existingExercise.durationSec,
            reps: this.hasOwn(exercise, 'reps')
              ? exercise.reps
              : existingExercise.reps,
            restSec: this.hasOwn(exercise, 'restSec')
              ? exercise.restSec
              : existingExercise.restSec,
            orderIndex: exercise.orderIndex ?? exerciseIndex,
            notes: this.hasOwn(exercise, 'notes')
              ? exercise.notes
              : existingExercise.notes,
          },
        });
        continue;
      }

      if (!libraryExercise && !exercise.name) {
        throw new BadRequestException('Exercise name is required');
      }

      await tx.classSessionSectionExercise.create({
        data: {
          organizationId,
          sectionId,
          exerciseId: libraryExercise?.id ?? null,
          name: exercise.name ?? libraryExercise?.name ?? '',
          description:
            exercise.description ??
            libraryExercise?.detailedDescription ??
            libraryExercise?.shortDescription,
          durationSec:
            exercise.durationSec ??
            this.minutesToSeconds(libraryExercise?.averageDurationMinutes),
          reps: exercise.reps,
          restSec: exercise.restSec,
          orderIndex: exercise.orderIndex ?? exerciseIndex,
          notes: exercise.notes,
        },
      });
    }
  }

  private async findAccessibleLibraryExercises(
    ids: string[],
    organizationId: string,
  ) {
    if (ids.length === 0) {
      return new Map<string, LibraryExerciseSnapshot>();
    }

    const exercises = await this.prisma.exercise.findMany({
      where: {
        id: { in: ids },
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

    if (exercises.length !== ids.length) {
      throw new NotFoundException('Exercise not found');
    }

    return new Map(exercises.map((exercise) => [exercise.id, exercise]));
  }

  private ensureNoDuplicateIds(ids: string[], message: string) {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(message);
    }
  }

  private hasOwn(object: object, property: string) {
    return Object.prototype.hasOwnProperty.call(object, property);
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

  private async ensureCanManageClassSessionForUser(
    userId: string,
    classSessionId: string,
    organizationId?: string,
  ) {
    const session = await this.prisma.classSession.findFirst({
      where: {
        id: classSessionId,
        ...(organizationId ? { organizationId } : {}),
      },
      select: { organizationId: true },
    });

    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    return this.ensureUserCanManageOrganization(userId, session.organizationId);
  }

  private async ensureCanManageSectionForUser(
    userId: string,
    sectionId: string,
    organizationId?: string,
  ) {
    const section = await this.prisma.classSessionSection.findFirst({
      where: {
        id: sectionId,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        organizationId: true,
        classSession: { select: { organizationId: true } },
      },
    });

    if (
      !section ||
      section.classSession.organizationId !== section.organizationId
    ) {
      throw new NotFoundException('Class session section not found');
    }

    return this.ensureUserCanManageOrganization(userId, section.organizationId);
  }

  private async ensureCanManageSectionExerciseForUser(
    userId: string,
    id: string,
    organizationId?: string,
  ) {
    const exercise = await this.prisma.classSessionSectionExercise.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        organizationId: true,
        section: {
          select: {
            organizationId: true,
            classSession: { select: { organizationId: true } },
          },
        },
      },
    });

    if (
      !exercise ||
      exercise.section.organizationId !== exercise.organizationId ||
      exercise.section.classSession.organizationId !== exercise.organizationId
    ) {
      throw new NotFoundException('Class session section exercise not found');
    }

    return this.ensureUserCanManageOrganization(
      userId,
      exercise.organizationId,
    );
  }

  private async ensureUserCanManageOrganization(
    userId: string,
    organizationId: string,
  ) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        profileId: userId,
        status: MemberStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Organization access denied');
    }

    this.ensureCanManage(membership);

    return membership;
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
      select: { id: true, status: true, isEnabled: true, startsAt: true },
    });

    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    if (
      session.status !== ClassSessionStatus.SCHEDULED ||
      !session.isEnabled ||
      !session.startsAt
    ) {
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

  private toCreateStatus(
    status: ClassSessionStatus | undefined,
    startsAt: string | null | undefined,
  ) {
    if (!startsAt) {
      return ClassSessionStatus.DRAFT;
    }

    return status ?? ClassSessionStatus.SCHEDULED;
  }

  private toUpdateStatus(startsAt: string | null | undefined) {
    if (startsAt === undefined) {
      return undefined;
    }

    return startsAt ? ClassSessionStatus.SCHEDULED : ClassSessionStatus.DRAFT;
  }

  private toOptionalDateUpdate(value: string | null | undefined) {
    if (value === undefined) {
      return undefined;
    }

    return value ? new Date(value) : null;
  }

  private nextDateForWeekday(weekday: number) {
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      ),
    );
    const todayWeekday = this.weekdayFromDate(todayUtc);
    const daysUntil = (weekday - todayWeekday + 7) % 7;
    todayUtc.setUTCDate(todayUtc.getUTCDate() + daysUntil);

    return todayUtc.toISOString().slice(0, 10);
  }

  private weekdayFromDateString(date: string) {
    return this.weekdayFromDate(new Date(`${date}T00:00:00.000Z`));
  }

  private weekdayFromDate(date: Date) {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
  }

  private combineDateAndTime(date: string, time: Date | string) {
    return new Date(`${date}T${this.timeToString(time)}.000Z`);
  }

  private timeToString(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString().slice(11, 19);
    }

    return value.length === 5 ? `${value}:00` : value;
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

  private calculateEstimatedDurationMinutes(
    sections: Array<{
      exercises: Array<{ durationSec: number | null }>;
    }>,
  ) {
    const totalDurationSec = sections.reduce(
      (sectionTotal, section) =>
        sectionTotal +
        section.exercises.reduce(
          (exerciseTotal, exercise) =>
            exerciseTotal + (exercise.durationSec ?? 0),
          0,
        ),
      0,
    );

    return Math.ceil(totalDurationSec / 60);
  }
}
