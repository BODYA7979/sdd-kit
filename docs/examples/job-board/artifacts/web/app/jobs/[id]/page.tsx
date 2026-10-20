import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getJob } from '@/lib/api/jobs';
import { EMPLOYMENT_TYPE_LABELS } from '@/lib/search-params';

type JobPageProps = {
  params: Promise<{ id: string }>;
};

const loadJob = cache(getJob);

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await loadJob(id);
  return { title: job ? `${job.title} at ${job.company.name}` : 'Job not found' };
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  const job = await loadJob(id);

  if (!job) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <Link href="/jobs" className="text-sm font-medium text-blue-700 hover:underline">
        ← All jobs
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
        <p className="text-lg">
          <Link href={`/companies/${job.company.slug}`} className="font-medium text-blue-700 hover:underline">
            {job.company.name}
          </Link>
        </p>
        <ul className="flex flex-wrap gap-2 text-sm text-gray-700">
          <li className="rounded-full bg-gray-100 px-3 py-1">{job.location}</li>
          {job.remote && <li className="rounded-full bg-green-100 px-3 py-1 text-green-800">Remote</li>}
          <li className="rounded-full bg-gray-100 px-3 py-1">{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</li>
        </ul>
        {job.published_at && (
          <p className="text-sm text-gray-500">
            Posted{' '}
            <time dateTime={job.published_at}>
              {new Date(job.published_at).toLocaleDateString('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })}
            </time>
          </p>
        )}
      </header>

      <section className="whitespace-pre-line leading-relaxed text-gray-800">{job.description}</section>

      <Link
        href={`/jobs/${job.id}/apply`}
        className="inline-block rounded-md bg-gray-900 px-5 py-2.5 font-medium text-white hover:bg-gray-700"
      >
        Apply
      </Link>
    </main>
  );
}
