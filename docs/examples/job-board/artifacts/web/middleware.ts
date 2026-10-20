import { NextResponse, type NextRequest } from 'next/server';

/**
 * Cheap first gate: no session cookie means no access to account pages. Token
 * validity and roles are checked again on the server by requireUser().
 * Keep in sync with lib/session.ts SESSION_COOKIE (middleware runs on the edge
 * runtime and cannot import server-only modules).
 */
const SESSION_COOKIE = 'hireboard_session';

export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/applications/:path*',
    '/employer/:path*',
    '/admin/:path*',
    '/jobs/:id/apply',
  ],
};
