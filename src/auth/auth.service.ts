import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type JwtAuthUser = {
  id: string;
  email?: string | null;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureProfile(user: JwtAuthUser) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return this.prisma.profile.upsert({
      where: { id: user.id },
      update: {
        email: user.email ?? undefined,
      },
      create: {
        id: user.id,
        email: user.email ?? null,
      },
    });
  }

  async getMe(user: JwtAuthUser) {
    const profile = await this.ensureProfile(user);

    const memberships = await this.prisma.organizationMember.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'asc' },
      include: {
        organization: true,
      },
    });

    return {
      id: user.id,
      email: user.email ?? profile.email,
      profile,
      memberships: memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        status: membership.status,
        organization: membership.organization,
      })),
    };
  }
}
