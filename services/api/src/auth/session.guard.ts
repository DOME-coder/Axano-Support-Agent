import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { tenants } from '../db/schema';
import type { RequestWithTenant } from './tenant-api-key.guard';

const SESSION_COOKIE = 'avatardesk_session';

let cachedSecretKey: Uint8Array | null = null;

function buildSecretKey(): Uint8Array {
  if (cachedSecretKey) {
    return cachedSecretKey;
  }
  const secret = process.env.APP_SECRET;
  if (secret) {
    cachedSecretKey = new TextEncoder().encode(secret);
    return cachedSecretKey;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_SECRET is required in production');
  }
  // Dev fallback — same per-process key the magic-link controller
  // uses. Each api restart rotates the key and invalidates all
  // outstanding sessions.
  const devSecret = `dev-fallback-${process.pid}-${Date.now()}`;
  cachedSecretKey = new TextEncoder().encode(devSecret);
  return cachedSecretKey;
}

interface SessionRequest extends RequestWithTenant {
  cookies?: Record<string, string>;
}

@Injectable()
export class SessionGuard implements CanActivate {
  private readonly logger = new Logger(SessionGuard.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();

    // Express does not parse cookies by default; we read the raw
    // header and pull out the session value. This keeps the guard
    // dependency-free of cookie-parser middleware.
    const cookieHeader = request.header('cookie') ?? '';
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    const sessionToken = match?.[1];
    if (!sessionToken) {
      throw new UnauthorizedException('no session cookie');
    }

    let tenantId: string;
    try {
      const { payload } = await jwtVerify(sessionToken, buildSecretKey());
      if (payload.purpose !== 'session' || typeof payload.tenantId !== 'string') {
        throw new Error('invalid claims');
      }
      tenantId = payload.tenantId;
    } catch (err) {
      this.logger.warn(`session verify rejected: ${(err as Error).message}`);
      throw new UnauthorizedException('invalid or expired session');
    }

    const rows = await this.db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const tenant = rows[0];
    if (!tenant) {
      throw new UnauthorizedException('tenant no longer exists');
    }
    request.tenant = tenant;
    return true;
  }
}
