import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { OrganizationRoleGuard } from '../guards/organization-role.guard';

export const ORGANIZATION_ROLES_KEY = 'organizationRoles';
export const ORGANIZATION_STAFF_ROLES = [
  OrganizationRole.OWNER,
  OrganizationRole.ADMIN,
  OrganizationRole.COACH,
];

export const OrganizationRoles = (...roles: OrganizationRole[]) =>
  SetMetadata(ORGANIZATION_ROLES_KEY, roles);

export const OrganizationWriteAccess = () =>
  applyDecorators(
    OrganizationRoles(...ORGANIZATION_STAFF_ROLES),
    UseGuards(OrganizationRoleGuard),
  );
