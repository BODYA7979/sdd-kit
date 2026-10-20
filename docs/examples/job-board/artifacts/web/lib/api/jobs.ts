import 'server-only';

import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api/common';
import type { Company, JobFilters, JobPosting } from '@/types/api/jobs';
import { ApiError, apiFetch } from './client';

export function searchJobs(filters: JobFilters): Promise<PaginatedEnvelope<JobPosting>> {
  return apiFetch<PaginatedEnvelope<JobPosting>>('searchJobs', {
    query: {
      q: filters.q,
      location: filters.location,
      remote: filters.remote,
      employment_type: filters.employment_type,
      company: filters.company,
      page: filters.page,
      per_page: filters.per_page,
    },
  });
}

/** null when the posting is unknown or not open (API 404 job_not_found, BR-10). */
export async function getJob(id: string): Promise<JobPosting | null> {
  try {
    const response = await apiFetch<ApiEnvelope<JobPosting>>('showJob', { params: { id } });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** null when no company has this slug (API 404 company_not_found). */
export async function getCompany(slug: string): Promise<Company | null> {
  try {
    const response = await apiFetch<ApiEnvelope<Company>>('showCompany', { params: { slug } });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
