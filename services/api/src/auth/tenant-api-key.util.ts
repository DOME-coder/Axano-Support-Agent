import { createHash, randomBytes } from 'node:crypto';

// Tenant API keys follow the "ad_<hex>" pattern. The prefix is
// stable so logs can refer to keys without leaking the secret part.
// Only the sha256 hash lives in the database (tenants.api_key_hash);
// the plaintext key is shown to the tenant exactly once at creation.

export const API_KEY_PREFIX = 'ad_';

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString('hex')}`;
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && value.length > API_KEY_PREFIX.length;
}
