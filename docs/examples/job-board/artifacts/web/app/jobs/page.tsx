import type { Metadata } from 'next';
import Link from 'next/link';
import { JobCard } from '@/components/job-card';
import { JobFilters } from '@/components/job-filters';
import { searchJobs } from '@/lib/api/jobs';
import { parseJobFilters, toQueryString, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Jobs',
};

type JobsPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const filters = parseJobFilters(await searchParams);
  const { data: jobs, meta } = await searchJobs(filters);

  const pageHref = (page: number) => {
    const query = toQueryString({ ...filters, page });
    return query ? `/jobs?${query}` : '/jobs';
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Open jobs</h1>
        <p className="mt-1 text-sm text-gray-600">
          {meta.total === 1 ? '1 job matches' : `${meta.total} jobs match`} your search.
        </p>
      </header>

      <JobFilters filters={filters} />

      {jobs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
          No open jobs match these filters.{' '}
          <Link href="/jobs" className="font-medium text-blue-700 hover:underline">
            Clear all filters
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      )}

      {meta.last_page > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {meta.current_page > 1 ? (
            <Link href={pageHref(meta.current_page - 1)} className="font-medium text-blue-700 hover:underline">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-600">
            Page {meta.current_page} of {meta.last_page}
          </span>
          {meta.current_page < meta.last_page ? (
            <Link href={pageHref(meta.current_page + 1)} className="font-medium text-blue-700 hover:underline">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
