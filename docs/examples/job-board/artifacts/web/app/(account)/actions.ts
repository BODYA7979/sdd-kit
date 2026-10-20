'use server';

import { redirect } from 'next/navigation';

import { ApiError } from '@/lib/api/client';
import { logout } from '@/lib/api/auth';
import { clearSessionToken, getSessionToken } from '@/lib/session';

/**
 * Revokes the token on the API, then clears the cookie. The cookie is cleared even
 * when the API call fails, so the browser is signed out either way. If the API cannot
 * be reached, the token outlives the cookie until it expires (BR-04), so the failure
 * is logged.
 */
export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();

  if (token) {
    try {
      await logout(token);
    } catch (error) {
      // A 401 means the token is already expired or revoked, so there is nothing to revoke.
      if (!(error instanceof ApiError && error.status === 401)) {
        console.error('Logout could not revoke the API token', error);
      }
    }
  }

  await clearSessionToken();
  redirect('/login');
}
