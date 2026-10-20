import Link from 'next/link';
import { EMPLOYMENT_TYPE_LABELS } from '@/lib/search-params';
import type { JobPosting, Salary } from '@/types/api/jobs';

/** "€60,000 – €80,000 a year"; one-sided ranges read "From …" / "Up to …". */
function formatSalary(salary: Salary): string {
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: salary.currency,
    maximumFractionDigits: 0,
  });

  if (salary.min !== null && salary.max !== null) {
    return `${money.format(salary.min)} – ${money.format(salary.max)} a year`;
  }
  if (salary.min !== null) {
    return `From ${money.format(salary.min)} a year`;
  }
  return `Up to ${money.format(salary.max ?? 0)} a year`;
}

export function JobCard({ job }: { job: JobPosting }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300">
      <h2 className="text-lg font-semibold text-gray-900">
        <Link href={`/jobs/${job.id}`} className="hover:underline">
          {job.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-gray-700">
        {job.company.name} · {job.location}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2 text-xs text-gray-700">
        {job.remote && <li className="rounded-full bg-green-100 px-2.5 py-0.5 text-green-800">Remote</li>}
        <li className="rounded-full bg-gray-100 px-2.5 py-0.5">{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</li>
        {job.salary && <li className="rounded-full bg-gray-100 px-2.5 py-0.5">{formatSalary(job.salary)}</li>}
      </ul>
    </article>
  );
}
