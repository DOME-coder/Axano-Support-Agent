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

/**
 * Build a non-secret hint for a hashed key, derived from the hash
 * itself: prefix + last 4 hex characters of the sha256. We can't
 * reconstruct the plaintext tail (we never stored it), so the
 * dashboard shows hash-tail as a "this is *some* key" indicator
 * rather than the user-facing key suffix. Phase 2 may persist a
 * short non-secret label (e.g. nickname) instead.
 */
export function hashTailHint(hash: string): string {
  return hash.slice(-4);
}
