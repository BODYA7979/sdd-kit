import type { EmploymentType, JobFilters } from '@/types/api/jobs';

export type SearchParams = Record<string, string | string[] | undefined>;

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

const MAX_PER_PAGE = 50;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function isEmploymentType(value: string): value is EmploymentType {
  return Object.hasOwn(EMPLOYMENT_TYPE_LABELS, value);
}

function positiveInt(value: string | undefined, max?: number): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  if (parsed < 1 || (max !== undefined && parsed > max)) return undefined;
  return parsed;
}

/**
 * Turns the /jobs URL query into API filters. Empty and unknown values are
 * dropped so a hand-edited URL never produces a 422 from the API.
 */
export function parseJobFilters(searchParams: SearchParams): JobFilters {
  const filters: JobFilters = {};

  const q = first(searchParams.q);
  if (q) filters.q = q.slice(0, 120);

  const location = first(searchParams.location);
  if (location) filters.location = location.slice(0, 120);

  const remote = first(searchParams.remote);
  if (remote === '1' || remote === 'true') filters.remote = true;
  if (remote === '0' || remote === 'false') filters.remote = false;

  const employmentType = first(searchParams.employment_type);
  if (employmentType && isEmploymentType(employmentType)) filters.employment_type = employmentType;

  const company = first(searchParams.company);
  if (company && /^[a-z0-9-]{1,80}$/.test(company)) filters.company = company;

  const page = positiveInt(first(searchParams.page));
  if (page) filters.page = page;

  const perPage = positiveInt(first(searchParams.per_page), MAX_PER_PAGE);
  if (perPage) filters.per_page = perPage;

  return filters;
}

/** Serializes filters back into a query string (without the leading "?"). */
export function toQueryString(filters: JobFilters): string {
  const search = new URLSearchParams();
  if (filters.q) search.set('q', filters.q);
  if (filters.location) search.set('location', filters.location);
  if (filters.remote !== undefined) search.set('remote', filters.remote ? '1' : '0');
  if (filters.employment_type) search.set('employment_type', filters.employment_type);
  if (filters.company) search.set('company', filters.company);
  if (filters.page && filters.page > 1) search.set('page', String(filters.page));
  if (filters.per_page) search.set('per_page', String(filters.per_page));
  return search.toString();
}
