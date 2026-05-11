// Idempotent seed runner. Creates the Axano demo tenant and its
// avatar config if they don't already exist. Generates a fresh
// tenant API key on first run and writes it to a gitignored file
// at repo-root (.tenant-api-key.local, chmod 0600). The plaintext
// is never logged to stdout or stored in the database — only its
// sha256 hash lives in tenants.api_key_hash.

import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { writeFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const REPO_ROOT = resolve(__dirname, '../../../..');
config({ path: resolve(REPO_ROOT, '.env') });

import { avatarConfigs, tenants } from './schema';
import { generateApiKey, hashApiKey } from '../auth/tenant-api-key.util';
import {
  generateInternalToken,
  hashInternalToken,
} from '../auth/internal-service.util';
import { existsSync } from 'node:fs';

const DEMO_TENANT_NAME = 'Axano';
const DEMO_TENANT_EMAIL = 'team@axano.com';

async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const db = drizzle(client, { schema: { tenants, avatarConfigs } });

  // eslint-disable-next-line no-console
  console.log('seeding demo tenant...');

  const existing = await db.select().from(tenants).where(eq(tenants.name, DEMO_TENANT_NAME)).limit(1);
  let tenantId: string;
  let printedKey: string | null = null;

  if (existing[0]) {
    tenantId = existing[0].id;
    // eslint-disable-next-line no-console
    console.log(`  tenant "${DEMO_TENANT_NAME}" already exists (id=${tenantId}), skipping`);
  } else {
    const apiKey = generateApiKey();
    const [created] = await db
      .insert(tenants)
      .values({
        name: DEMO_TENANT_NAME,
        billingEmail: DEMO_TENANT_EMAIL,
        plan: 'starter',
        apiKeyHash: hashApiKey(apiKey),
      })
      .returning();
    if (!created) {
      throw new Error('failed to insert tenant');
    }
    tenantId = created.id;
    printedKey = apiKey;
    // eslint-disable-next-line no-console
    console.log(`  created tenant "${DEMO_TENANT_NAME}" (id=${tenantId})`);
  }

  const existingConfig = await db
    .select()
    .from(avatarConfigs)
    .where(eq(avatarConfigs.tenantId, tenantId))
    .limit(1);

  if (existingConfig[0]) {
    // eslint-disable-next-line no-console
    console.log(`  avatar_config already exists, skipping`);
  } else {
    const beyAvatarId = process.env.BEY_DEFAULT_AVATAR_ID;
    const voiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID;
    const greeting =
      process.env.AGENT_GREETING_TEXT ?? 'Hallo, ich bin Sofia. Wobei kann ich dir helfen?';

    if (!beyAvatarId || !voiceId) {
      throw new Error('BEY_DEFAULT_AVATAR_ID and ELEVENLABS_DEFAULT_VOICE_ID must be set');
    }

    await db.insert(avatarConfigs).values({
      tenantId,
      beyAvatarId,
      elevenlabsVoiceId: voiceId,
      language: 'de',
      personaPrompt:
        'Du bist Sofia, eine freundliche, kompetente Customer-Service-Mitarbeiterin von Axano. Du sprichst Deutsch, bist geduldig und antwortest knapp und praktisch.',
      greeting,
      isCustomAvatar: false,
    });
    // eslint-disable-next-line no-console
    console.log(`  created avatar_config (bey_avatar_id=${beyAvatarId.slice(0, 8)}..., voice=${voiceId.slice(0, 8)}...)`);
  }

  await client.end();

  // Internal service token: shared secret between api and agent for
  // /api/internal/* endpoints. Generated once and persisted to a
  // gitignored file at repo-root; the hash is stored in another
  // gitignored file that the api reads via INTERNAL_SERVICE_TOKEN_HASH
  // env. The plaintext also goes into .internal-service-token.local
  // so the agent can read it on startup.
  const internalTokenPath = resolve(REPO_ROOT, '.internal-service-token.local');
  const internalHashPath = resolve(REPO_ROOT, '.internal-service-token-hash.local');
  if (!existsSync(internalTokenPath) || !existsSync(internalHashPath)) {
    const token = generateInternalToken();
    writeFileSync(internalTokenPath, `${token}\n`, { encoding: 'utf8' });
    chmodSync(internalTokenPath, 0o600);
    writeFileSync(internalHashPath, `${hashInternalToken(token)}\n`, { encoding: 'utf8' });
    chmodSync(internalHashPath, 0o600);
    // eslint-disable-next-line no-console
    console.log('  generated internal service token (.internal-service-token.local)');
    // eslint-disable-next-line no-console
    console.log('  → add INTERNAL_SERVICE_TOKEN_HASH=$(cat .internal-service-token-hash.local) to .env');
  } else {
    // eslint-disable-next-line no-console
    console.log('  internal service token files already exist, skipping');
  }

  if (printedKey) {
    // Never stdout-print the plaintext. Write to a gitignored file
    // at repo-root with restrictive permissions. This avoids
    // accidental leaks via terminal scrollback, IDE telemetry that
    // ships terminal output to assistants, screen sharing, etc.
    const keyFilePath = resolve(REPO_ROOT, '.tenant-api-key.local');
    writeFileSync(keyFilePath, `${printedKey}\n`, { encoding: 'utf8' });
    chmodSync(keyFilePath, 0o600);

    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // eslint-disable-next-line no-console
    console.log('Tenant API key written to: .tenant-api-key.local');
    // eslint-disable-next-line no-console
    console.log('(gitignored, chmod 0600, plaintext shown nowhere else)');
    // eslint-disable-next-line no-console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('Use it as the X-Tenant-API-Key header. The plaintext');
    // eslint-disable-next-line no-console
    console.log('lives only in that file and not in the database. If');
    // eslint-disable-next-line no-console
    console.log('you lose it, delete the tenant row and re-run db:seed.');
  }
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('seed failed:', err);
  process.exit(1);
});
