/**
 * Every API endpoint the web server calls (INV-06). The API contract in
 * api/docs/api/api-contracts.md is authoritative; scripts/contract-sync.mjs
 * compares this registry with `php artisan route:list --json` in CI.
 * Placeholders such as {id} are filled from apiFetch's `params`.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface EndpointDefinition {
  method: HttpMethod;
  path: string;
}

export const endpoints = {
  searchJobs: { method: 'GET', path: '/api/v1/jobs' },
  showJob: { method: 'GET', path: '/api/v1/jobs/{id}' },
  showCompany: { method: 'GET', path: '/api/v1/companies/{slug}' },

  register: { method: 'POST', path: '/api/v1/auth/register' },
  login: { method: 'POST', path: '/api/v1/auth/login' },
  logout: { method: 'POST', path: '/api/v1/auth/logout' },
  me: { method: 'GET', path: '/api/v1/auth/me' },

  listCompanyReviews: { method: 'GET', path: '/api/v1/companies/{slug}/reviews' },
  submitCompanyReview: { method: 'POST', path: '/api/v1/companies/{slug}/reviews' },
  showMyCompanyReview: { method: 'GET', path: '/api/v1/companies/{slug}/reviews/mine' },
  listPendingReviews: { method: 'GET', path: '/api/v1/admin/reviews' },
  approveReview: { method: 'POST', path: '/api/v1/admin/reviews/{id}/approve' },
  rejectReview: { method: 'POST', path: '/api/v1/admin/reviews/{id}/reject' },

  showMyProfile: { method: 'GET', path: '/api/v1/me/profile' },
  upsertMyProfile: { method: 'PUT', path: '/api/v1/me/profile' },

  submitApplication: { method: 'POST', path: '/api/v1/jobs/{id}/applications' },
  listMyApplications: { method: 'GET', path: '/api/v1/me/applications' },
  listEmployerApplications: { method: 'GET', path: '/api/v1/employer/applications' },
} as const satisfies Record<string, EndpointDefinition>;

export type EndpointName = keyof typeof endpoints;
