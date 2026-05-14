import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type OrganizationRequest = Request & {
  currentOrganizationId?: string;
};

export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<OrganizationRequest>();
    const header = request.headers['x-organization-id'];
    const headerOrganizationId = Array.isArray(header) ? header[0] : header;

    return (
      request.params?.organizationId ??
      request.currentOrganizationId ??
      headerOrganizationId
    );
  },
);
