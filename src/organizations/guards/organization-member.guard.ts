import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import type { OrganizationMember } from '@prisma/client';
import type { Request } from 'express';
import type { JwtAuthUser } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

type OrganizationRequest = Request & {
  user?: JwtAuthUser;
  currentOrganizationId?: string;
  organizationMembership?: OrganizationMember;
};

@Injectable()
export class OrganizationMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OrganizationRequest>();
    const organizationId =
      request.params?.organizationId ?? this.getOrganizationHeader(request);
    const userId = request.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenException('Organization access denied');
    }

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

    request.organizationMembership = membership;
    request.currentOrganizationId = organizationId;
    return true;
  }

  private getOrganizationHeader(request: OrganizationRequest) {
    const header = request.headers['x-organization-id'];

    if (Array.isArray(header)) {
      return header[0];
    }

    return header;
  }
}
