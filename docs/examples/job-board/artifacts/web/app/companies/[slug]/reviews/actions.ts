'use server';

import { redirect } from 'next/navigation';

import { ApiError } from '@/lib/api/client';
import { submitCompanyReview } from '@/lib/api/reviews';

export type ReviewField = 'rating' | 'title' | 'body';

export interface ReviewFormState {
  status: 'idle' | 'success' | 'error';
  message: string | null;
  fieldErrors: Partial<Record<ReviewField, string>>;
}

const FIELDS: readonly ReviewField[] = ['rating', 'title', 'body'];

/** Messages for the API error codes this form can receive (api/docs/api/api-contracts.md). */
const ERROR_MESSAGES: Record<string, string> = {
  review_already_exists: 'You have already reviewed this company.',
  forbidden: 'Only candidates can review companies.',
  company_not_found: 'This company no longer exists.',
};

function toFieldErrors(errors: Record<string, string[]> | undefined): ReviewFormState['fieldErrors'] {
  const fieldErrors: ReviewFormState['fieldErrors'] = {};

  for (const [key, messages] of Object.entries(errors ?? {})) {
    if (FIELDS.includes(key as ReviewField) && messages.length > 0) {
      fieldErrors[key as ReviewField] = messages[0];
    }
  }

  return fieldErrors;
}

export async function submitReviewAction(
  slug: string,
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const input = {
    rating: Number(formData.get('rating') ?? 0),
    title: String(formData.get('title') ?? '').trim(),
    body: String(formData.get('body') ?? '').trim(),
  };

  try {
    await submitCompanyReview(slug, input);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }

    if (error.status === 401) {
      redirect(`/login?next=/companies/${encodeURIComponent(slug)}/reviews`);
    }

    if (error.code === 'validation_failed') {
      return {
        status: 'error',
        message: 'Please fix the highlighted fields.',
        fieldErrors: toFieldErrors(error.errors),
      };
    }

    return {
      status: 'error',
      message: ERROR_MESSAGES[error.code] ?? 'Your review could not be submitted. Please try again.',
      fieldErrors: {},
    };
  }

  // No revalidatePath here: the form stays mounted to show the confirmation.
  // The next visit renders the status card instead of the form.
  return {
    status: 'success',
    message: 'Thanks - your review is awaiting moderation.',
    fieldErrors: {},
  };
}
