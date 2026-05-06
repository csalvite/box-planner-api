import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { InvitationsEmailService } from './invitations-email.service';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly invitationsEmailService: InvitationsEmailService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    membership: OrganizationMember,
    dto: CreateInvitationDto,
  ) {
    this.ensureCanInvite(membership);
    const token = this.createToken();
    const inviteUrl = this.buildInviteUrl(token);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        email: dto.email.toLowerCase(),
        role: this.toPrismaRole(dto.role),
        status: InvitationStatus.PENDING,
        token,
        invitedById: userId,
        expiresAt: this.createExpiryDate(),
      },
    });

    let emailSent = false;

    try {
      emailSent = await this.invitationsEmailService.sendInvitationEmail({
        to: invitation.email,
        inviteUrl,
      });
    } catch (error) {
      this.logger.warn(
        `Invitation email could not be sent for ${invitation.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    return {
      invitation,
      inviteUrl,
      emailSent,
    };
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

  private buildInviteUrl(token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!frontendUrl) {
      throw new InternalServerErrorException('Frontend URL is not configured');
    }

    return `${frontendUrl.replace(/\/+$/, '')}/invite?token=${encodeURIComponent(
      token,
    )}`;
  }

  private toPrismaRole(role?: CreateInvitationDto['role']) {
    return role ? OrganizationRole[role] : OrganizationRole.VIEWER;
  }
}
