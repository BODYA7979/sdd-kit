import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ApplyForm } from '@/components/apply-form';
import { getJob } from '@/lib/api/jobs';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Apply · Hireboard' };

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(['candidate']);

  const job = await getJob(id);
  if (!job) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <Link href={`/jobs/${job.id}`} className="text-sm text-zinc-600 hover:underline">
        ← Back to the job
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Apply: {job.title}</h1>
        <p className="text-zinc-600">
          {job.company.name} · {job.location}
          {job.remote ? ' · Remote' : ''}
        </p>
      </header>
      <ApplyForm jobId={job.id} />
    </main>
  );
}
