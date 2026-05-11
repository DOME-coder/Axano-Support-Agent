import { NextResponse, type NextRequest } from 'next/server';

// Phase-1 session check is intentionally shallow: the middleware
// only verifies that a session cookie is present, not that it is
// cryptographically valid. The api's /me endpoint does the actual
// verification on every page load (via the client-side fetchMe
// query), so a tampered cookie is caught there and triggers a
// redirect back to /login.
//
// We accept this for phase 1 because the dashboard ships only to
// the demo tenant and a tampered cookie costs the attacker no
// data — they would just see /avatar render briefly before /me
// 401s them out. Phase 2's session-revocation work will move the
// check fully into the middleware via a Redis lookup.

const SESSION_COOKIE = 'avatardesk_session';
const PUBLIC_PATHS = ['/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|api/|favicon.ico).*)'],
};
