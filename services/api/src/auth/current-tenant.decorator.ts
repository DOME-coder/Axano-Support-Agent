import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Tenant } from '../db/schema';
import type { RequestWithTenant } from './tenant-api-key.guard';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Tenant => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    if (!request.tenant) {
      throw new Error('CurrentTenant used without TenantApiKeyGuard');
    }
    return request.tenant;
  },
);
