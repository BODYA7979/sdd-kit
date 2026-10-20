import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { fetchMe } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { User, UserRole } from '@/types/api/auth';

/**
 * The Sanctum token lives only in this HttpOnly cookie on the web origin (INV-05,
 * ADR-0001). Browser JavaScript can never read it; server code forwards it as a
 * bearer token through lib/api/client.ts.
 */
export const SESSION_COOKIE = 'hireboard_session';

/** Matches the API token lifetime (BR-04), so cookie and token expire together. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value || undefined;
}

/** Only callable from Server Actions and Route Handlers (Next.js forbids cookie writes during render). */
export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Only callable from Server Actions and Route Handlers. */
export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * The signed-in user, or null for guests and for a cookie whose token was revoked
 * or has expired. Cached per request, so a layout and its page share one API call.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  try {
    return await fetchMe(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
});

/**
 * Server-side guard for protected pages and actions. middleware.ts only checks that
 * the cookie exists; this checks that the token is still valid and the role fits.
 * Guests go to /login, signed-in users with the wrong role go to /dashboard.
 */
export async function requireUser(roles?: readonly UserRole[]): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (roles && !roles.includes(user.role)) {
    redirect('/dashboard');
  }

  return user;
}
