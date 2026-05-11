import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionGuard } from './session.guard';
import { TenantApiKeyGuard } from './tenant-api-key.guard';
import type { RequestWithTenant } from './tenant-api-key.guard';

// Accepts either the widget's X-Tenant-API-Key header or the
// dashboard's session cookie. Useful for endpoints that need to
// serve both — knowledge upload is the canonical example: the
// embed widget posts pdfs with the api key, the dashboard ui does
// the same thing with a session.
//
// Both underlying guards attach the tenant to req.tenant on
// success, so downstream controllers can use @CurrentTenant()
// regardless of which path authenticated.

@Injectable()
export class SessionOrApiKeyGuard implements CanActivate {
  constructor(
    @Inject(SessionGuard) private readonly sessionGuard: SessionGuard,
    @Inject(TenantApiKeyGuard) private readonly apiKeyGuard: TenantApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();

    // Prefer the api-key header when present: widgets always send
    // it, and it's cheaper than the session jwt verify.
    if (request.header('x-tenant-api-key')) {
      return this.apiKeyGuard.canActivate(context);
    }
    if (request.header('cookie')?.includes('avatardesk_session=')) {
      return this.sessionGuard.canActivate(context);
    }
    throw new UnauthorizedException('no auth credentials (api-key or session)');
  }
}
