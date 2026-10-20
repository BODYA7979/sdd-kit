import type { Metadata } from 'next';
import Link from 'next/link';

import { approveReviewAction, rejectReviewAction } from '@/app/(account)/admin/reviews/actions';
import { StarRating } from '@/components/star-rating';
import { listPendingReviews } from '@/lib/api/reviews';
import { requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review queue | Hireboard',
};

interface ReviewQueuePageProps {
  searchParams: Promise<{ page?: string; error?: string }>;
}

const ERROR_COPY: Record<string, string> = {
  review_already_moderated: 'Another admin already moderated that review.',
  review_not_found: 'That review no longer exists.',
  validation_failed: 'A rejection reason needs 5 to 255 characters.',
};

export default async function ReviewQueuePage({ searchParams }: ReviewQueuePageProps) {
  await requireUser(['admin']);
  const { page: pageParam, error } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
  const queue = await listPendingReviews(page);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {queue.meta.total} pending, oldest first. Decisions are final and the rejection reason is shown to the
          candidate.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {Object.hasOwn(ERROR_COPY, error)
            ? ERROR_COPY[error]
            : 'The decision could not be saved. Please try again.'}
        </p>
      )}

      {queue.data.length === 0 ? (
        <p className="text-zinc-600">Nothing to moderate.</p>
      ) : (
        <ul className="space-y-4">
          {queue.data.map((review) => (
            <li key={review.id} className="space-y-3 rounded-lg border border-zinc-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600">
                <span>
                  <Link href={`/companies/${encodeURIComponent(review.company.slug)}`} className="text-blue-700 hover:underline">
                    {review.company.name}
                  </Link>{' '}
                  · by {review.candidate_name}
                </span>
                <StarRating rating={review.rating} />
              </div>
              <h2 className="font-medium">{review.title}</h2>
              <p className="whitespace-pre-line text-sm text-zinc-700">{review.body}</p>

              <div className="flex flex-wrap items-end gap-4">
                <form action={approveReviewAction.bind(null, review.id)}>
                  <button type="submit" className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white">
                    Approve
                  </button>
                </form>
                <form action={rejectReviewAction.bind(null, review.id)} className="flex items-end gap-2">
                  <label className="text-sm">
                    <span className="block font-medium">Rejection reason</span>
                    <input
                      name="reason"
                      required
                      minLength={5}
                      maxLength={255}
                      className="mt-1 w-72 rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <button type="submit" className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white">
                    Reject
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {queue.meta.last_page > 1 && (
        <nav aria-label="Queue pages" className="flex gap-4 text-sm">
          {page > 1 && (
            <Link href={`/admin/reviews?page=${page - 1}`} className="text-blue-700 hover:underline">
              Previous
            </Link>
          )}
          {page < queue.meta.last_page && (
            <Link href={`/admin/reviews?page=${page + 1}`} className="text-blue-700 hover:underline">
              Next
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
