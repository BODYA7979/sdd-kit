import 'server-only';

import { ApiError, apiFetch } from '@/lib/api/client';
import { getSessionToken } from '@/lib/session';
import type { ApiEnvelope } from '@/types/api/common';
import type {
  MyCompanyReview,
  PendingReview,
  PendingReviewListResponse,
  ReviewListResponse,
  SubmitCompanyReviewInput,
} from '@/types/api/reviews';

/** Approved reviews plus meta.average_rating. Throws ApiError 404 company_not_found for an unknown slug. */
export async function listCompanyReviews(slug: string, page = 1): Promise<ReviewListResponse> {
  return apiFetch<ReviewListResponse>('listCompanyReviews', {
    params: { slug },
    query: { page },
  });
}

/** The signed-in candidate's review of this company, or null when they have not written one. */
export async function getMyCompanyReview(slug: string): Promise<MyCompanyReview | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  try {
    const response = await apiFetch<ApiEnvelope<MyCompanyReview>>('showMyCompanyReview', {
      params: { slug },
      token,
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.code === 'review_not_found') {
      return null;
    }
    throw error;
  }
}

/** Throws ApiError: 409 review_already_exists, 422 with field errors, 403 for non-candidates. */
export async function submitCompanyReview(slug: string, input: SubmitCompanyReviewInput): Promise<MyCompanyReview> {
  const token = await getSessionToken();
  const response = await apiFetch<ApiEnvelope<MyCompanyReview>>('submitCompanyReview', {
    params: { slug },
    body: input,
    token,
  });

  return response.data;
}

export async function listPendingReviews(page = 1): Promise<PendingReviewListResponse> {
  const token = await getSessionToken();

  return apiFetch<PendingReviewListResponse>('listPendingReviews', {
    query: { page },
    token,
  });
}

/** Throws ApiError 409 review_already_moderated when another admin decided first. */
export async function approveReview(id: string): Promise<PendingReview> {
  const token = await getSessionToken();
  const response = await apiFetch<ApiEnvelope<PendingReview>>('approveReview', { params: { id }, token });

  return response.data;
}

/** The reason (5-255 chars) is shown to the candidate. Throws ApiError 422 or 409. */
export async function rejectReview(id: string, reason: string): Promise<PendingReview> {
  const token = await getSessionToken();
  const response = await apiFetch<ApiEnvelope<PendingReview>>('rejectReview', {
    params: { id },
    body: { reason },
    token,
  });

  return response.data;
}
