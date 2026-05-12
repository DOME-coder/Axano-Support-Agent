// Process-wide JWT secret key for dashboard auth (magic-link + session).
//
// Why this lives in its own module: previously both
// dashboard-auth.controller.ts and session.guard.ts had their own
// `let cachedSecretKey` + `buildSecretKey()`. In the dev fallback
// path (APP_SECRET unset) each one generated its own
// `dev-fallback-<pid>-<Date.now()>` constant on first call. Since
// the two were warmed up at different points in the request
// lifecycle, they ended up with **different** keys for the same
// process: the controller signed JWTs with K1, the guard tried to
// verify them with K2, every session request 401'd.
//
// One module = one cached key = JWTs signed and verified with the
// same secret. Production must still set APP_SECRET in .env; in
// dev a deterministic fallback derived from process.pid keeps
// sessions stable across requests within the same process while
// rotating naturally on every api restart.

const DEV_FALLBACK_WARNING =
  '[jwt-secret] APP_SECRET not set; using a stable per-process dev fallback. ' +
  'Set APP_SECRET in .env for sessions that survive across api restarts.';

let cachedSecretKey: Uint8Array | null = null;
let warnedAboutFallback = false;

export function getJwtSecretKey(): Uint8Array {
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
  // Deterministic-per-process: same pid -> same key for all calls
  // within this process. No Date.now() — that was the source of
  // the controller/guard key drift.
  const devSecret = `dev-fallback-${process.pid}`;
  cachedSecretKey = new TextEncoder().encode(devSecret);
  if (!warnedAboutFallback) {
    // eslint-disable-next-line no-console
    console.warn(DEV_FALLBACK_WARNING);
    warnedAboutFallback = true;
  }
  return cachedSecretKey;
}

export const SESSION_COOKIE = 'avatardesk_session';
