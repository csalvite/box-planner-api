import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClassScheduleDefault,
  MemberStatus,
  OrganizationMember,
  OrganizationRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassScheduleDefaultDto } from './dto/create-class-schedule-default.dto';
import { UpdateClassScheduleDefaultDto } from './dto/update-class-schedule-default.dto';

@Injectable()
export class ClassScheduleDefaultsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, membership: OrganizationMember) {
    this.ensureCanRead(membership);

    const defaults = await this.prisma.classScheduleDefault.findMany({
      where: { organizationId },
      orderBy: [{ weekday: 'asc' }, { startsAtTime: 'asc' }],
    });

    return defaults.map((scheduleDefault) =>
      this.serializeScheduleDefault(scheduleDefault),
    );
  }

  async create(
    organizationId: string,
    membership: OrganizationMember,
    dto: CreateClassScheduleDefaultDto,
  ) {
    this.ensureCanManage(membership);
    this.ensureTimeRange(dto.startsAtTime, dto.endsAtTime);

    if (dto.coachId) {
      await this.ensureCoachBelongsToOrganization(dto.coachId, organizationId);
    }

    const scheduleDefault = await this.prisma.classScheduleDefault.create({
      data: {
        organizationId,
        coachId: dto.coachId ?? null,
        weekday: dto.weekday,
        startsAtTime: this.timeStringToDate(dto.startsAtTime),
        endsAtTime: this.timeStringToDate(dto.endsAtTime),
        label: dto.label,
        isActive: dto.isActive,
      },
    });

    return this.serializeScheduleDefault(scheduleDefault);
  }

  async update(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: UpdateClassScheduleDefaultDto,
  ) {
    this.ensureCanManage(membership);
    const existing = await this.ensureScheduleDefaultExists(
      id,
      organizationId,
    );
    const startsAtTime = dto.startsAtTime ?? this.timeToString(existing.startsAtTime);
    const endsAtTime = dto.endsAtTime ?? this.timeToString(existing.endsAtTime);
    this.ensureTimeRange(startsAtTime, endsAtTime);

    if (dto.coachId) {
      await this.ensureCoachBelongsToOrganization(dto.coachId, organizationId);
    }

    const scheduleDefault = await this.prisma.classScheduleDefault.update({
      where: { id },
      data: {
        coachId: dto.coachId,
        weekday: dto.weekday,
        startsAtTime:
          dto.startsAtTime === undefined
            ? undefined
            : this.timeStringToDate(dto.startsAtTime),
        endsAtTime:
          dto.endsAtTime === undefined
            ? undefined
            : this.timeStringToDate(dto.endsAtTime),
        label: dto.label,
        isActive: dto.isActive,
      },
    });

    return this.serializeScheduleDefault(scheduleDefault);
  }

  async remove(
    id: string,
    organizationId: string,
    membership: OrganizationMember,
  ) {
    this.ensureCanManage(membership);
    await this.ensureScheduleDefaultExists(id, organizationId);

    await this.prisma.classScheduleDefault.deleteMany({
      where: { id, organizationId },
    });

    return { id, deleted: true };
  }

  private async ensureScheduleDefaultExists(
    id: string,
    organizationId: string,
  ) {
    const scheduleDefault = await this.prisma.classScheduleDefault.findFirst({
      where: { id, organizationId },
    });

    if (!scheduleDefault) {
      throw new NotFoundException('Class schedule default not found');
    }

    return scheduleDefault;
  }

  private async ensureCoachBelongsToOrganization(
    coachId: string,
    organizationId: string,
  ) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        profileId: coachId,
        status: MemberStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new NotFoundException('Coach not found');
    }
  }

  private ensureCanManage(membership: OrganizationMember) {
    const allowedRoles: OrganizationRole[] = [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.COACH,
    ];

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Class schedule default access denied');
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
      throw new ForbiddenException('Class schedule default access denied');
    }
  }

  private ensureTimeRange(startsAtTime: string, endsAtTime: string) {
    if (this.timeToSeconds(endsAtTime) <= this.timeToSeconds(startsAtTime)) {
      throw new BadRequestException('Schedule default end time must be later');
    }
  }

  private timeStringToDate(time: string) {
    return new Date(`1970-01-01T${this.normalizeTime(time)}.000Z`);
  }

  private timeToString(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString().slice(11, 19);
    }

    return this.normalizeTime(value);
  }

  private normalizeTime(time: string) {
    return time.length === 5 ? `${time}:00` : time;
  }

  private timeToSeconds(time: string) {
    const [hours, minutes, seconds] = this.normalizeTime(time)
      .split(':')
      .map(Number);

    return hours * 3600 + minutes * 60 + seconds;
  }

  private serializeScheduleDefault(scheduleDefault: ClassScheduleDefault) {
    return {
      ...scheduleDefault,
      startsAtTime: this.timeToString(scheduleDefault.startsAtTime),
      endsAtTime: this.timeToString(scheduleDefault.endsAtTime),
    };
  }
}
