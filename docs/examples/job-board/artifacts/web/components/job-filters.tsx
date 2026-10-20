'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { EMPLOYMENT_TYPE_LABELS, toQueryString } from '@/lib/search-params';
import type { EmploymentType, JobFilters as Filters } from '@/types/api/jobs';

const employmentTypes = Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentType, string][];

/**
 * A GET-style form: submitting navigates to /jobs?... so every search is a
 * shareable URL and the page itself stays a Server Component. The submit
 * handler drops empty fields, so ticking "Remote only" gives /jobs?remote=1
 * rather than /jobs?q=&location=&employment_type=&remote=1. Changing filters
 * resets to page 1 because the form does not carry the page number.
 */
export function JobFilters({ filters }: { filters: Filters }) {
  const router = useRouter();
  const withoutCompany = toQueryString({ ...filters, company: undefined, page: undefined });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    for (const [name, value] of new FormData(event.currentTarget)) {
      if (typeof value === 'string' && value.trim() !== '') query.set(name, value.trim());
    }
    const qs = query.toString();
    router.push(qs ? `/jobs?${qs}` : '/jobs');
  }

  return (
    <form
      action="/jobs"
      onSubmit={onSubmit}
      key={toQueryString(filters)}
      className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-end"
    >
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Keyword</span>
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Laravel, designer…"
          maxLength={120}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-gray-700">Location</span>
        <input
          type="text"
          name="location"
          defaultValue={filters.location}
          placeholder="Berlin"
          maxLength={120}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-gray-700">Type</span>
        <select
          name="employment_type"
          defaultValue={filters.employment_type ?? ''}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        >
          <option value="">Any</option>
          {employmentTypes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
        Search
      </button>

      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="remote" value="1" defaultChecked={filters.remote === true} />
          Remote only
        </label>

        {filters.company && (
          <>
            <input type="hidden" name="company" value={filters.company} />
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">
              Company: {filters.company}{' '}
              <Link
                href={withoutCompany ? `/jobs?${withoutCompany}` : '/jobs'}
                aria-label="Remove company filter"
                className="ml-1 font-semibold hover:underline"
              >
                ×
              </Link>
            </span>
          </>
        )}
      </div>
    </form>
  );
}
