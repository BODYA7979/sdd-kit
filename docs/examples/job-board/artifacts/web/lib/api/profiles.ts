import 'server-only';

import { ApiError, apiFetch } from '@/lib/api/client';
import { getSessionToken } from '@/lib/session';
import type { ApiEnvelope } from '@/types/api/common';
import type { CandidateProfile, CandidateProfileInput } from '@/types/api/profiles';

/** Returns null while the candidate has not saved a profile yet (API 404 profile_not_found). */
export async function getMyProfile(): Promise<CandidateProfile | null> {
  const token = await getSessionToken();

  try {
    const response = await apiFetch<ApiEnvelope<CandidateProfile>>('showMyProfile', { token });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.code === 'profile_not_found') {
      return null;
    }
    throw error;
  }
}

/** Creates or replaces the profile. Throws ApiError (status 422 with field errors) on invalid input. */
export async function saveMyProfile(input: CandidateProfileInput): Promise<CandidateProfile> {
  const token = await getSessionToken();
  const response = await apiFetch<ApiEnvelope<CandidateProfile>>('upsertMyProfile', {
    token,
    body: input,
  });

  return response.data;
}
