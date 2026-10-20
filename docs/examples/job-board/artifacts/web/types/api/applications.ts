import type { JobPostingStatus } from './jobs';

/** A candidate's own application (GET /api/v1/me/applications, POST /api/v1/jobs/{id}/applications). */
export interface JobApplication {
  id: string;
  job: {
    id: string;
    title: string;
    company: {
      slug: string;
      name: string;
    };
  };
  cover_letter: string | null;
  submitted_at: string;
}

/** An application as the owning employer sees it (GET /api/v1/employer/applications). */
export interface EmployerApplication {
  id: string;
  job: {
    id: string;
    title: string;
    status: JobPostingStatus;
  };
  candidate: {
    name: string;
    email: string;
    headline: string | null;
  };
  cover_letter: string | null;
  submitted_at: string;
}

export interface SubmitApplicationInput {
  cover_letter?: string;
}
