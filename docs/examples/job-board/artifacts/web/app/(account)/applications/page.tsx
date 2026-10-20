import type { Metadata } from 'next';
import Link from 'next/link';

import { listMyApplications } from '@/lib/api/applications';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'My applications · Hireboard' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MyApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(['candidate']);

  const query = await searchParams;
  const page = Math.max(1, Number(firstValue(query.page)) || 1);
  const justApplied = firstValue(query.applied) === '1';
  const { data: applications, meta } = await listMyApplications(page);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">My applications</h1>

      {justApplied ? (
        <p role="status" className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          Application sent. The employer can now see it.
        </p>
      ) : null}

      {applications.length === 0 ? (
        <p className="text-zinc-600">
          You have not applied to any jobs yet.{' '}
          <Link href="/jobs" className="underline">
            Browse open jobs
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
          {applications.map((application) => (
            <li key={application.id} className="space-y-1 p-4">
              <Link href={`/jobs/${application.job.id}`} className="font-medium text-zinc-900 hover:underline">
                {application.job.title}
              </Link>
              <p className="text-sm text-zinc-600">
                <Link href={`/companies/${application.job.company.slug}`} className="hover:underline">
                  {application.job.company.name}
                </Link>{' '}
                · Submitted {dateFormat.format(new Date(application.submitted_at))}
              </p>
            </li>
          ))}
        </ul>
      )}

      {meta.last_page > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {meta.current_page > 1 ? <Link href={`/applications?page=${meta.current_page - 1}`}>← Newer</Link> : <span />}
          <span className="text-zinc-600">
            Page {meta.current_page} of {meta.last_page}
          </span>
          {meta.current_page < meta.last_page ? (
            <Link href={`/applications?page=${meta.current_page + 1}`}>Older →</Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
