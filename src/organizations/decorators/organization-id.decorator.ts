import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type OrganizationRequest = Request & {
  currentOrganizationId?: string;
};

export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<OrganizationRequest>();
    return request.params?.organizationId ?? request.currentOrganizationId;
  },
);
