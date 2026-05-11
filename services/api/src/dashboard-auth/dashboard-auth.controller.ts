import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { chmodSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { tenants } from '../db/schema';

// Phase-1 dashboard auth: console-magic-link, billing_email lookup.
// See ADR 006 for the trade-off and the phase-2 acceptance criteria
// that retire this controller's whole approach.
//
// Flow:
//   POST /api/dashboard-auth/request-magic-link  { email }
//     -> 200 always (no enumeration), prints link to server stdout
//   GET  /api/dashboard-auth/verify?token=...
//     -> sets HTTP-only session cookie, redirects to dashboard
//   POST /api/dashboard-auth/logout
//     -> clears session cookie

interface RequestMagicLinkBody {
  email?: string;
}

interface RequestMagicLinkResponse {
  ok: true;
}

const MAGIC_LINK_TTL_SECONDS = 15 * 60;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
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
  // Phase-1 dev convenience: a stable per-process secret so login
  // sessions survive page reloads without forcing the user to fill
  // .env on first run. Production must set APP_SECRET via .env.
  // eslint-disable-next-line no-console
  console.warn(
    '[DashboardAuth] APP_SECRET not set; using a per-process dev fallback. Set APP_SECRET in .env for stable sessions across restarts.',
  );
  const devSecret = `dev-fallback-${process.pid}-${Date.now()}`;
  cachedSecretKey = new TextEncoder().encode(devSecret);
  return cachedSecretKey;
}

@Controller('api/dashboard-auth')
export class DashboardAuthController {
  private readonly logger = new Logger(DashboardAuthController.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  @Post('request-magic-link')
  async requestMagicLink(@Body() body: RequestMagicLinkBody): Promise<RequestMagicLinkResponse> {
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      throw new HttpException('email is required', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.billingEmail, email))
      .limit(1);
    const tenant = rows[0];

    if (!tenant) {
      // Don't leak whether the email exists. The console log makes
      // it obvious in dev mode that we hit this branch; phase 2 will
      // also send the email (or not) without changing the api shape.
      this.logger.warn(`magic-link requested for unknown email (no tenant)`);
      return { ok: true };
    }

    const token = await new SignJWT({ tenantId: tenant.id, purpose: 'magic-link' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${MAGIC_LINK_TTL_SECONDS}s`)
      .sign(buildSecretKey());

    const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3001';
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
    const link = `${apiBaseUrl}/api/dashboard-auth/verify?token=${token}&next=${encodeURIComponent(dashboardUrl)}`;

    // Never log the full link/token to stdout (terminal scrollback,
    // ide telemetry, screen sharing all see it). Write it to a
    // gitignored file at repo-root and log only the file path plus
    // the token tail so the operator can confirm freshness without
    // exposing the token itself. ADR 006 documents this.
    const linkFilePath = resolve(__dirname, '../../../../.last-magic-link.local');
    try {
      writeFileSync(linkFilePath, `${link}\n`, { encoding: 'utf8' });
      chmodSync(linkFilePath, 0o600);
    } catch (err) {
      this.logger.error(`failed to write magic link to ${linkFilePath}: ${(err as Error).message}`);
    }

    this.logger.log(
      `magic-link generated: tenant=${tenant.name} ttl=${MAGIC_LINK_TTL_SECONDS}s tail=...${token.slice(-6)}`,
    );
    this.logger.log(
      `→ open .last-magic-link.local at repo root and click the url inside`,
    );

    return { ok: true };
  }

  // GET is okay here: the token is single-use only via expiration,
  // not via DB lookup. Phase-2 will add server-side revocation.
  @Get('verify')
  async verify(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = String(req.query.token ?? '');
    const next = String(req.query.next ?? process.env.DASHBOARD_URL ?? 'http://localhost:3001');
    if (!token) {
      res.status(400).json({ error: 'token required' });
      return;
    }

    let tenantId: string;
    try {
      const { payload } = await jwtVerify(token, buildSecretKey());
      if (payload.purpose !== 'magic-link' || typeof payload.tenantId !== 'string') {
        throw new Error('invalid token claims');
      }
      tenantId = payload.tenantId;
    } catch (err) {
      this.logger.warn(`magic-link verify rejected: ${(err as Error).message}`);
      res.status(401).json({ error: 'invalid or expired token' });
      return;
    }

    const sessionToken = await new SignJWT({ tenantId, purpose: 'session' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
      .sign(buildSecretKey());

    res.cookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_SECONDS * 1000,
      path: '/',
    });
    res.redirect(302, next);
  }

  @Post('logout')
  logout(@Res() res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  }

  @Get('me')
  async me(@Req() req: Request): Promise<{ tenantId: string; name: string }> {
    const cookieHeader = req.headers.cookie ?? '';
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    const sessionToken = match?.[1];
    if (!sessionToken) {
      throw new HttpException('no session', HttpStatus.UNAUTHORIZED);
    }
    try {
      const { payload } = await jwtVerify(sessionToken, buildSecretKey());
      if (payload.purpose !== 'session' || typeof payload.tenantId !== 'string') {
        throw new Error('invalid claims');
      }
      const rows = await this.db
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, payload.tenantId))
        .limit(1);
      const tenant = rows[0];
      if (!tenant) {
        throw new HttpException('tenant not found', HttpStatus.UNAUTHORIZED);
      }
      return { tenantId: tenant.id, name: tenant.name };
    } catch (err) {
      this.logger.warn(`session check failed: ${(err as Error).message}`);
      throw new HttpException('invalid session', HttpStatus.UNAUTHORIZED);
    }
  }
}
