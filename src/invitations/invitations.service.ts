import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvitationStatus,
  MemberStatus,
  OrganizationRole,
} from '@prisma/client';
import type { OrganizationMember } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthService } from '../auth/auth.service';
import type { JwtAuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: CreateInvitationDto,
  ) {
    this.ensureCanInvite(membership);

    return this.prisma.invitation.create({
      data: {
        organizationId,
        email: dto.email.toLowerCase(),
        role: this.toPrismaRole(dto.role),
        status: InvitationStatus.PENDING,
        token: this.createToken(),
        invitedById: userId,
        expiresAt: this.createExpiryDate(),
      },
    });
  }

  async findAll(organizationId: string, membership: OrganizationMember) {
    this.ensureCanInvite(membership);

    return this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: true,
        acceptedBy: true,
      },
    });
  }

  async accept(user: JwtAuthUser, dto: AcceptInvitationDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is not pending');
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    const profile = await this.authService.ensureProfile(user);
    const existingMembership =
      await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_profileId: {
            organizationId: invitation.organizationId,
            profileId: profile.id,
          },
        },
      });

    if (!existingMembership) {
      await this.prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          profileId: profile.id,
          role: invitation.role,
          status: MemberStatus.ACTIVE,
        },
      });
    }

    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedById: profile.id,
        acceptedAt: new Date(),
      },
      include: {
        organization: true,
      },
    });
  }

  private ensureCanInvite(membership: OrganizationMember) {
    const allowedRoles: OrganizationRole[] = [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.COACH,
    ];

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Invitation access denied');
    }
  }

  private createToken() {
    return randomBytes(32).toString('hex');
  }

  private createExpiryDate() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  private toPrismaRole(role?: CreateInvitationDto['role']) {
    return role ? OrganizationRole[role] : OrganizationRole.VIEWER;
  }
}
