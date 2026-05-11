import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Internal service token gates the /api/internal/* surface. Only the
// agent (and later other internal workers) should be able to reach
// those endpoints — they expose per-conversation persona, message
// inserts, and lifecycle updates, none of which a tenant should
// touch directly.
//
// We store only the sha256 hash in env as INTERNAL_SERVICE_TOKEN_HASH.
// The plaintext lives in .internal-service-token.local (gitignored,
// 0600) and is shared between the api process and the agent process
// via that file.

export const INTERNAL_TOKEN_PREFIX = 'iss_';

export function generateInternalToken(): string {
  return `${INTERNAL_TOKEN_PREFIX}${randomBytes(32).toString('hex')}`;
}

export function hashInternalToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export function looksLikeInternalToken(value: string): boolean {
  return value.startsWith(INTERNAL_TOKEN_PREFIX) && value.length > INTERNAL_TOKEN_PREFIX.length;
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
