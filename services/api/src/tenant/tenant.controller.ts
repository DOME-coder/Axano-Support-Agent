import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { RegenerateApiKeyResponse, TenantApiKeyHint } from '@avatardesk/shared';
import { eq } from 'drizzle-orm';
import { chmodSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { SessionGuard } from '../auth/session.guard';
import {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  hashTailHint,
} from '../auth/tenant-api-key.util';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { tenants, type Tenant } from '../db/schema';

// Dashboard-only routes for tenant self-management. Both routes
// are session-guarded; nothing here is callable with the api key
// (a leaked api key must not be able to rotate itself).

@Controller('api/tenant')
@UseGuards(SessionGuard)
export class TenantController {
  private readonly logger = new Logger(TenantController.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  @Get('api-key-hint')
  hint(@CurrentTenant() tenant: Tenant): TenantApiKeyHint {
    return {
      prefix: API_KEY_PREFIX,
      tail: hashTailHint(tenant.apiKeyHash),
      // We don't track generation time per key yet (phase 2 will
      // add api_key_rotated_at to the schema). For now we use the
      // tenant creation time as a stable lower bound.
      generatedAt: tenant.createdAt.toISOString(),
    };
  }

  @Post('regenerate-api-key')
  async regenerate(@CurrentTenant() tenant: Tenant): Promise<RegenerateApiKeyResponse> {
    const newKey = generateApiKey();
    const newHash = hashApiKey(newKey);

    await this.db
      .update(tenants)
      .set({ apiKeyHash: newHash })
      .where(eq(tenants.id, tenant.id));

    // Persist plaintext to the gitignored file, same pattern as
    // pnpm db:seed. Never log or return the plaintext.
    const repoRoot = resolve(__dirname, '../../../..');
    const keyFilePath = resolve(repoRoot, '.tenant-api-key.local');
    try {
      writeFileSync(keyFilePath, `${newKey}\n`, { encoding: 'utf8' });
      chmodSync(keyFilePath, 0o600);
    } catch (err) {
      this.logger.error(`failed to write rotated api key: ${(err as Error).message}`);
      throw new HttpException(
        'failed to persist new api key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(
      `tenant ${tenant.id} rotated api key (tail=${hashTailHint(newHash)})`,
    );

    return {
      hint: {
        prefix: API_KEY_PREFIX,
        tail: hashTailHint(newHash),
        generatedAt: new Date().toISOString(),
      },
      storedAt: '.tenant-api-key.local',
    };
  }
}
