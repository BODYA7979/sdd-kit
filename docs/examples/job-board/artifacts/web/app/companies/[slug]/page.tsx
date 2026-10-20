import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { JobCard } from '@/components/job-card';
import { ApiError } from '@/lib/api/client';
import { getCompany, searchJobs } from '@/lib/api/jobs';
import { listCompanyReviews } from '@/lib/api/reviews';

type CompanyPageProps = {
  params: Promise<{ slug: string }>;
};

// Same shape the API accepts for the company filter (JobSearchDTO, max 80 chars).
// A slug outside it can never exist, and sending it on would make the jobs
// request fail validation (422) before notFound() runs.
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

const loadCompany = cache(getCompany);

export async function generateMetadata({ params }: CompanyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const company = SLUG_PATTERN.test(slug) ? await loadCompany(slug) : null;
  return { title: company ? `${company.name} careers` : 'Company not found' };
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// The company and reviews requests run in parallel. An unknown slug makes the
// reviews endpoint answer 404 company_not_found as well; swallowing that here
// lets the page reach notFound() instead of the error boundary.
async function loadReviewSummary(slug: string) {
  try {
    return await listCompanyReviews(slug, 1);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { slug } = await params;

  if (!SLUG_PATTERN.test(slug)) {
    notFound();
  }

  const [company, jobs, reviews] = await Promise.all([
    loadCompany(slug),
    searchJobs({ company: slug }),
    loadReviewSummary(slug),
  ]);

  if (!company) {
    notFound();
  }

  const averageRating = reviews?.meta.average_rating ?? null;
  const reviewCount = reviews?.meta.total ?? 0;
  const hasMoreJobs = jobs.meta.total > jobs.data.length;

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{company.name}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
          {company.location && <span>{company.location}</span>}
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline"
            >
              {company.website}
            </a>
          )}
        </p>
        {company.description && (
          <p className="max-w-prose whitespace-pre-line text-gray-700">{company.description}</p>
        )}
      </header>

      <section aria-labelledby="rating-heading" className="rounded-lg border border-gray-200 p-5">
        <h2 id="rating-heading" className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Candidate rating
        </h2>
        {averageRating === null ? (
          <p className="mt-2 text-lg text-gray-700">No reviews yet</p>
        ) : (
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-gray-900">{averageRating.toFixed(1)}</span>
            <span className="text-sm text-gray-600">
              out of 5 · {plural(reviewCount, 'review', 'reviews')}
            </span>
          </p>
        )}
        <Link
          href={`/companies/${company.slug}/reviews`}
          className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
        >
          Read and write reviews
        </Link>
      </section>

      <section aria-labelledby="jobs-heading" className="space-y-4">
        <h2 id="jobs-heading" className="text-xl font-semibold text-gray-900">
          Open jobs ({company.open_jobs_count})
        </h2>
        {jobs.data.length === 0 ? (
          <p className="text-gray-600">{company.name} has no open jobs right now.</p>
        ) : (
          <ul className="space-y-3">
            {jobs.data.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ul>
        )}
        {hasMoreJobs && (
          <Link
            href={`/jobs?company=${encodeURIComponent(company.slug)}`}
            className="inline-block text-sm font-medium text-blue-700 hover:underline"
          >
            See all {plural(jobs.meta.total, 'job', 'jobs')}
          </Link>
        )}
      </section>
    </main>
  );
}
