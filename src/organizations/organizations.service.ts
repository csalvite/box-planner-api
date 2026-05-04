import { ConflictException, Injectable } from '@nestjs/common';
import {
  MemberStatus,
  OrganizationRole,
  OrganizationType,
  Prisma,
} from '@prisma/client';
import { AuthService, JwtAuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(user: JwtAuthUser) {
    const profile = await this.authService.ensureProfile(user);

    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        profileId: profile.id,
        status: MemberStatus.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        organization: true,
      },
    });

    return memberships.map((membership) => ({
      ...membership.organization,
      membership: {
        role: membership.role,
        status: membership.status,
      },
    }));
  }

  async create(user: JwtAuthUser, dto: CreateOrganizationDto) {
    const profile = await this.authService.ensureProfile(user);
    const slug = dto.slug ?? this.slugify(dto.name);

    try {
      const organization = await this.prisma.organization.create({
        data: {
          name: dto.name,
          slug,
          type: dto.type ?? OrganizationType.GYM,
          members: {
            create: {
              profileId: profile.id,
              role: OrganizationRole.OWNER,
              status: MemberStatus.ACTIVE,
            },
          },
        },
        include: {
          members: {
            where: { profileId: profile.id },
          },
        },
      });

      const membership = organization.members[0];
      const { members, ...createdOrganization } = organization;

      return {
        ...createdOrganization,
        membership: {
          role: membership.role,
          status: membership.status,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Organization slug already exists');
      }

      throw error;
    }
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'organization';
  }
}
