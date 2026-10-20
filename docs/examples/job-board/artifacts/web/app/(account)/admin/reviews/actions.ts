'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ApiError } from '@/lib/api/client';
import { approveReview, rejectReview } from '@/lib/api/reviews';
import { requireUser } from '@/lib/session';

// Every decision ends on the bare queue URL, which also clears an earlier ?error banner.
const QUEUE_PATH = '/admin/reviews';

/** Turns an API refusal into a banner on the queue page; anything else goes to the error boundary. */
function errorRedirect(error: unknown): never {
  if (error instanceof ApiError) {
    redirect(`${QUEUE_PATH}?error=${encodeURIComponent(error.code)}`);
  }
  throw error;
}

export async function approveReviewAction(id: string): Promise<void> {
  await requireUser(['admin']);

  try {
    await approveReview(id);
  } catch (error) {
    errorRedirect(error);
  }

  revalidatePath(QUEUE_PATH);
  redirect(QUEUE_PATH);
}

export async function rejectReviewAction(id: string, formData: FormData): Promise<void> {
  await requireUser(['admin']);
  const reason = String(formData.get('reason') ?? '').trim();

  try {
    await rejectReview(id, reason);
  } catch (error) {
    errorRedirect(error);
  }

  revalidatePath(QUEUE_PATH);
  redirect(QUEUE_PATH);
}
