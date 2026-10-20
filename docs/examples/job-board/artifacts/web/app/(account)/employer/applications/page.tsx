import type { Metadata } from 'next';
import Link from 'next/link';

import { listEmployerApplications } from '@/lib/api/applications';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Applications · Hireboard' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EmployerApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(['employer']);

  const query = await searchParams;
  const page = Math.max(1, Number(firstValue(query.page)) || 1);
  const { data: applications, meta } = await listEmployerApplications(page);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Applications</h1>
        <p className="text-sm text-zinc-600">
          {meta.total} {meta.total === 1 ? 'application' : 'applications'} to your company&apos;s jobs, newest first.
        </p>
      </header>

      {applications.length === 0 ? (
        <p className="text-zinc-600">No one has applied to your jobs yet.</p>
      ) : (
        <ul className="space-y-4">
          {applications.map((application) => (
            <li key={application.id} className="space-y-2 rounded-md border border-zinc-200 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-zinc-900">
                  {application.candidate.name}
                  {application.candidate.headline ? (
                    <span className="font-normal text-zinc-600"> · {application.candidate.headline}</span>
                  ) : null}
                </p>
                <p className="text-sm text-zinc-500">{dateFormat.format(new Date(application.submitted_at))}</p>
              </div>
              <p className="text-sm text-zinc-600">
                Applied for {application.job.title}
                {application.job.status !== 'open' ? (
                  <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs uppercase text-zinc-700">
                    {application.job.status}
                  </span>
                ) : null}
              </p>
              <a href={`mailto:${application.candidate.email}`} className="text-sm underline">
                {application.candidate.email}
              </a>
              {application.cover_letter ? (
                <p className="whitespace-pre-line text-sm text-zinc-800">{application.cover_letter}</p>
              ) : (
                <p className="text-sm italic text-zinc-500">No cover letter.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {meta.last_page > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {meta.current_page > 1 ? (
            <Link href={`/employer/applications?page=${meta.current_page - 1}`}>← Newer</Link>
          ) : (
            <span />
          )}
          <span className="text-zinc-600">
            Page {meta.current_page} of {meta.last_page}
          </span>
          {meta.current_page < meta.last_page ? (
            <Link href={`/employer/applications?page=${meta.current_page + 1}`}>Older →</Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
