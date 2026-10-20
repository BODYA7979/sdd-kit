/** Must match App\Enums\EmploymentType exactly. */
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';

/** Must match App\Enums\JobPostingStatus exactly. Only 'open' is ever public. */
export type JobPostingStatus = 'draft' | 'open' | 'closed';

export interface CompanySummary {
  id: string;
  slug: string;
  name: string;
  location: string | null;
}

/** Annual, whole currency units (INV-07). Either bound may be null. */
export interface Salary {
  min: number | null;
  max: number | null;
  currency: string;
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  employment_type: EmploymentType;
  salary: Salary | null;
  status: JobPostingStatus;
  published_at: string | null;
  company: CompanySummary;
}

export interface Company {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  location: string | null;
  description: string | null;
  open_jobs_count: number;
}

/** Query filters for GET /api/v1/jobs, as parsed from the /jobs URL. */
export interface JobFilters {
  q?: string;
  location?: string;
  remote?: boolean;
  employment_type?: EmploymentType;
  company?: string;
  page?: number;
  per_page?: number;
}
