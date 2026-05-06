import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus, OrganizationRole } from '@prisma/client';
import type { OrganizationMember } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';

@Injectable()
export class OrganizationMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, requester: OrganizationMember) {
    this.ensureCanList(requester);

    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: this.memberSelect(),
    });
  }

  async update(
    organizationId: string,
    memberId: string,
    requester: OrganizationMember,
    dto: UpdateOrganizationMemberDto,
  ) {
    this.ensureCanManage(requester);

    if (!dto.role && !dto.status) {
      throw new BadRequestException('No member changes provided');
    }

    const member = await this.findMemberOrThrow(organizationId, memberId);
    await this.ensureOwnerIsNotLeftAlone(organizationId, member, dto);

    return this.prisma.organizationMember.update({
      where: { id: member.id },
      data: {
        role: dto.role,
        status: dto.status,
      },
      select: this.memberSelect(),
    });
  }

  async remove(
    organizationId: string,
    memberId: string,
    requester: OrganizationMember,
  ) {
    this.ensureCanManage(requester);

    const member = await this.findMemberOrThrow(organizationId, memberId);
    await this.ensureOwnerIsNotLeftAlone(organizationId, member, {
      status: MemberStatus.REMOVED,
    });

    return this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { status: MemberStatus.REMOVED },
      select: this.memberSelect(),
    });
  }

  private ensureCanList(membership: OrganizationMember) {
    if (!this.listRoles().includes(membership.role)) {
      throw new ForbiddenException('Member access denied');
    }
  }

  private ensureCanManage(membership: OrganizationMember) {
    if (!this.manageRoles().includes(membership.role)) {
      throw new ForbiddenException('Member management denied');
    }
  }

  private async findMemberOrThrow(organizationId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
    });

    if (!member) {
      throw new NotFoundException('Organization member not found');
    }

    return member;
  }

  private async ensureOwnerIsNotLeftAlone(
    organizationId: string,
    member: OrganizationMember,
    dto: UpdateOrganizationMemberDto,
  ) {
    const changesRole =
      dto.role !== undefined && dto.role !== OrganizationRole.OWNER;
    const changesStatus =
      dto.status !== undefined && dto.status !== MemberStatus.ACTIVE;
    const changesActiveOwner =
      member.role === OrganizationRole.OWNER &&
      member.status === MemberStatus.ACTIVE &&
      (changesRole || changesStatus);

    if (!changesActiveOwner) {
      return;
    }

    const activeOwners = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        role: OrganizationRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });

    if (activeOwners <= 1) {
      throw new BadRequestException('Cannot remove the only owner');
    }
  }

  private memberSelect() {
    return {
      id: true,
      role: true,
      status: true,
      createdAt: true,
      profile: {
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    };
  }

  private listRoles(): OrganizationRole[] {
    return [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.COACH,
    ];
  }

  private manageRoles(): OrganizationRole[] {
    return [OrganizationRole.OWNER, OrganizationRole.ADMIN];
  }
}
