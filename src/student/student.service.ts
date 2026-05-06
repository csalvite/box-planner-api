import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  ClassSessionStatus,
  MemberStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextSession(userId: string) {
    const organizationIds = await this.getActiveOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return { session: null, training: null };
    }

    const session = await this.prisma.classSession.findFirst({
      where: {
        organizationId: { in: organizationIds },
        startsAt: { gte: new Date() },
        status: ClassSessionStatus.SCHEDULED,
      },
      orderBy: { startsAt: 'asc' },
      include: {
        organization: true,
      },
    });

    if (!session) {
      return { session: null, training: null };
    }

    const training = await this.prisma.training.findFirst({
      where: {
        id: session.trainingId,
        organizationId: session.organizationId,
      },
      include: {
        blocks: {
          orderBy: { orderIndex: 'asc' },
          include: {
            block: {
              include: {
                category: true,
                exercises: { orderBy: { orderIndex: 'asc' } },
              },
            },
          },
        },
      },
    });

    const sessionData = session;
    return { session: sessionData, training };
  }

  async getStats(userId: string) {
    const organizationIds = await this.getActiveOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return {
        totalAttendances: 0,
        currentStreak: 0,
        lastAttendanceDate: null,
      };
    }

    const attendances = await this.prisma.attendance.findMany({
      where: {
        profileId: userId,
        status: AttendanceStatus.PRESENT,
        classSession: {
          organizationId: { in: organizationIds },
        },
      },
      include: {
        classSession: {
          select: { startsAt: true },
        },
      },
    });

    const attendedDates = attendances
      .map((attendance) => attendance.classSession.startsAt)
      .sort((a, b) => b.getTime() - a.getTime());

    return {
      totalAttendances: attendedDates.length,
      currentStreak: this.calculateDayStreak(attendedDates),
      lastAttendanceDate: attendedDates[0] ?? null,
    };
  }

  private async getActiveOrganizationIds(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        profileId: userId,
        status: MemberStatus.ACTIVE,
      },
      select: { organizationId: true },
    });

    return memberships.map((membership) => membership.organizationId);
  }

  private calculateDayStreak(dates: Date[]) {
    const days = [...new Set(dates.map((date) => this.toDayKey(date)))];

    if (days.length === 0) {
      return 0;
    }

    let streak = 1;
    let previous = this.toUtcDay(days[0]);

    for (const day of days.slice(1)) {
      const current = this.toUtcDay(day);
      const expected = new Date(previous);
      expected.setUTCDate(expected.getUTCDate() - 1);

      if (current.getTime() !== expected.getTime()) {
        break;
      }

      streak += 1;
      previous = current;
    }

    return streak;
  }

  private toDayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toUtcDay(day: string) {
    return new Date(`${day}T00:00:00.000Z`);
  }
}
