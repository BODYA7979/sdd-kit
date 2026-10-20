import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ReviewForm } from '@/components/review-form';
import { StarRating } from '@/components/star-rating';
import { getCompany } from '@/lib/api/jobs';
import { getMyCompanyReview, listCompanyReviews } from '@/lib/api/reviews';
import { getCurrentUser } from '@/lib/session';
import type { MyCompanyReview } from '@/types/api/reviews';

export const metadata: Metadata = {
  title: 'Company reviews | Hireboard',
};

interface CompanyReviewsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const STATUS_COPY: Record<MyCompanyReview['status'], string> = {
  pending: 'Your review is awaiting moderation.',
  approved: 'Your review is published.',
  rejected: 'Your review was not published.',
};

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

function MyReviewCard({ review }: { review: MyCompanyReview }) {
  return (
    <section aria-labelledby="my-review-heading" className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
      <h2 id="my-review-heading" className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Your review
      </h2>
      <p className="mt-2 font-medium">{STATUS_COPY[review.status]}</p>
      {review.status === 'rejected' && review.rejection_reason && (
        <p className="mt-1 text-sm text-zinc-700">Reason: {review.rejection_reason}</p>
      )}
      <p className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
        <StarRating rating={review.rating} /> {review.title}
      </p>
    </section>
  );
}

export default async function CompanyReviewsPage({ params, searchParams }: CompanyReviewsPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);

  const company = await getCompany(slug);
  if (!company) {
    notFound();
  }

  const [reviews, user] = await Promise.all([listCompanyReviews(slug, page), getCurrentUser()]);
  const myReview = user?.role === 'candidate' ? await getMyCompanyReview(slug) : null;
  const { average_rating: averageRating, total, current_page: currentPage, last_page: lastPage } = reviews.meta;
  const reviewsPath = `/companies/${encodeURIComponent(company.slug)}/reviews`;

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm">
          <Link href={`/companies/${encodeURIComponent(company.slug)}`} className="text-blue-700 hover:underline">
            {company.name}
          </Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Reviews</h1>
        {averageRating === null ? (
          <p className="text-zinc-600">No published reviews yet.</p>
        ) : (
          <p className="flex items-center gap-2 text-zinc-700">
            <StarRating rating={averageRating} />
            <span className="font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-sm text-zinc-600">
              from {total} {total === 1 ? 'review' : 'reviews'}
            </span>
          </p>
        )}
      </header>

      {user === null && (
        <p className="text-sm text-zinc-700">
          <Link href={`/login?next=${encodeURIComponent(reviewsPath)}`} className="text-blue-700 hover:underline">
            Sign in as a candidate
          </Link>{' '}
          to review {company.name}.
        </p>
      )}
      {user?.role === 'candidate' &&
        (myReview ? <MyReviewCard review={myReview} /> : <ReviewForm slug={company.slug} companyName={company.name} />)}

      <section aria-labelledby="reviews-heading" className="space-y-4">
        <h2 id="reviews-heading" className="sr-only">
          Published reviews
        </h2>
        <ul className="space-y-4">
          {reviews.data.map((review) => (
            <li key={review.id} className="rounded-lg border border-zinc-200 p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-medium">{review.title}</h3>
                <StarRating rating={review.rating} />
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-zinc-700">{review.body}</p>
              <p className="mt-3 text-xs text-zinc-500">
                {review.author} · {dateFormat.format(new Date(review.created_at))}
              </p>
            </li>
          ))}
        </ul>

        {lastPage > 1 && (
          <nav aria-label="Review pages" className="flex justify-between text-sm">
            {currentPage > 1 ? (
              <Link href={`${reviewsPath}?page=${currentPage - 1}`} className="text-blue-700 hover:underline">
                Newer reviews
              </Link>
            ) : (
              <span />
            )}
            {currentPage < lastPage && (
              <Link href={`${reviewsPath}?page=${currentPage + 1}`} className="text-blue-700 hover:underline">
                Older reviews
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
