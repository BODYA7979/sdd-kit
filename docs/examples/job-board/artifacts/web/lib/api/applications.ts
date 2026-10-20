import 'server-only';

import { apiFetch } from '@/lib/api/client';
import { getSessionToken } from '@/lib/session';
import type { EmployerApplication, JobApplication, SubmitApplicationInput } from '@/types/api/applications';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api/common';

export async function submitApplication(jobId: string, input: SubmitApplicationInput): Promise<JobApplication> {
  const token = await getSessionToken();
  const response = await apiFetch<ApiEnvelope<JobApplication>>('submitApplication', {
    params: { id: jobId },
    body: input,
    token,
  });

  return response.data;
}

export async function listMyApplications(page = 1): Promise<PaginatedEnvelope<JobApplication>> {
  const token = await getSessionToken();

  return apiFetch<PaginatedEnvelope<JobApplication>>('listMyApplications', {
    query: { page },
    token,
  });
}

export async function listEmployerApplications(page = 1): Promise<PaginatedEnvelope<EmployerApplication>> {
  const token = await getSessionToken();

  return apiFetch<PaginatedEnvelope<EmployerApplication>>('listEmployerApplications', {
    query: { page },
    token,
  });
}
