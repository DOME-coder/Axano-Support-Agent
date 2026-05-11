import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { tenants, type Tenant } from '../db/schema';
import { API_KEY_PREFIX, hashApiKey, looksLikeApiKey } from './tenant-api-key.util';

export const TENANT_REQUEST_KEY = 'tenant';

// We attach the resolved tenant to the request object via this
// symbol-keyed property. CurrentTenant decorator reads it back.
// We do NOT use declare module 'express-serve-static-core' here
// because the express types aren't part of our typecheck graph.
export interface RequestWithTenant {
  tenant?: Tenant;
  header(name: string): string | undefined;
}

@Injectable()
export class TenantApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(TenantApiKeyGuard.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const header = request.header('x-tenant-api-key');

    if (!header || !looksLikeApiKey(header)) {
      throw new UnauthorizedException('missing or malformed X-Tenant-API-Key header');
    }

    const hash = hashApiKey(header);
    const rows = await this.db.select().from(tenants).where(eq(tenants.apiKeyHash, hash)).limit(1);
    const tenant = rows[0];

    if (!tenant) {
      // Log only the prefix + last 4 chars of the *hash* so future log
      // grepping can correlate without leaking either the plaintext
      // key or a hash that maps back to a row in the db.
      this.logger.warn(
        `auth rejected: prefix=${API_KEY_PREFIX} hash_tail=${hash.slice(-4)}`,
      );
      throw new UnauthorizedException('invalid X-Tenant-API-Key');
    }

    request.tenant = tenant;
    return true;
  }
}
