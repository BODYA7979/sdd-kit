import type { PaginatedEnvelope, PaginationMeta } from '@/types/api/common';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/** Public review. The author is always anonymous (BR-42). */
export interface CompanyReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: 'Verified candidate';
  created_at: string;
}

/** The signed-in candidate's own review, from GET /companies/{slug}/reviews/mine. */
export interface MyCompanyReview extends CompanyReview {
  status: ReviewStatus;
  rejection_reason: string | null;
}

/** Admin moderation queue item. Only admins see the candidate's name. */
export interface PendingReview extends CompanyReview {
  status: ReviewStatus;
  company: { slug: string; name: string };
  candidate_name: string;
}

export interface ReviewListMeta extends PaginationMeta {
  average_rating: number | null;
}

export type ReviewListResponse = PaginatedEnvelope<CompanyReview, ReviewListMeta>;

export type PendingReviewListResponse = PaginatedEnvelope<PendingReview>;

export interface SubmitCompanyReviewInput {
  rating: number;
  title: string;
  body: string;
}
