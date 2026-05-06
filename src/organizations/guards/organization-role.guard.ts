import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationRole } from '@prisma/client';
import type { OrganizationMember } from '@prisma/client';
import type { Request } from 'express';
import { ORGANIZATION_ROLES_KEY } from '../decorators/organization-roles.decorator';

type OrganizationRoleRequest = Request & {
  organizationMembership?: OrganizationMember;
};

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ORGANIZATION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<OrganizationRoleRequest>();
    const membership = request.organizationMembership;

    if (!membership || !roles.includes(membership.role)) {
      throw new ForbiddenException('Organization role access denied');
    }

    return true;
  }
}
