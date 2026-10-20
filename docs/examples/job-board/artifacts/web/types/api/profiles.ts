export interface CandidateProfile {
  id: string;
  headline: string;
  location: string | null;
  bio: string | null;
  skills: string[];
  years_experience: number;
  open_to_work: boolean;
  updated_at: string;
}

export interface CandidateProfileInput {
  headline: string;
  location: string | null;
  bio: string | null;
  skills: string[];
  years_experience: number;
  open_to_work: boolean;
}
