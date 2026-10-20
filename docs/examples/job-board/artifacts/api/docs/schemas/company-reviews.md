# Schema: company_reviews

## Purpose
Candidate reviews of companies. Every review passes admin moderation before it becomes public (BR-41, BR-42). Introduced by spec-HIRE-4-company-reviews.

## Fields

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | auto (HasUuids) | Primary key (INV-03) |
| company_id | uuid | No | — | Reviewed company. FK `companies.id`, cascade on delete |
| candidate_id | bigint | No | — | Author. FK `users.id`, cascade on delete. Always a user with role `candidate` (BR-40) |
| rating | unsigned tinyint | No | — | 1-5 inclusive |
| title | string(120) | No | — | 5-120 chars, validated in `SubmitCompanyReviewDTO` |
| body | text | No | — | 20-2000 chars, validated in `SubmitCompanyReviewDTO` |
| status | string(20) | No | `pending` | `App\Enums\ReviewStatus`: `pending`, `approved`, `rejected` |
| moderated_by | bigint | Yes | null | Admin who decided. FK `users.id`, null on delete |
| moderated_at | timestamp | Yes | null | When the decision was recorded (UTC, INV-04) |
| rejection_reason | string(255) | Yes | null | Required when status is `rejected` (5-255 chars). Shown to the author only |
| created_at | timestamp | Yes | null | Submission time. Public lists sort on it, newest first |
| updated_at | timestamp | Yes | null | Last change |

## Relationships
- belongs_to: companies (foreign_key: company_id)
- belongs_to: users as candidate (foreign_key: candidate_id)
- belongs_to: users as moderator (foreign_key: moderated_by)
- companies has_many company_reviews (`Company::reviews()`)

## Indexes
- PRIMARY: id
- UNIQUE: (company_id, candidate_id) (purpose: one review per candidate per company, whatever its status; BR-40)
- INDEX: (company_id, status) (purpose: the public list and the average read approved rows of one company)

## Constraints
- rating: 1-5, enforced by validation (SQLite has no unsigned range check).
- status transitions: `pending` → `approved` or `pending` → `rejected` only. No transition out of a decided state (BR-44). The repository updates with `WHERE status = 'pending'`, so concurrent decisions cannot overwrite each other.
- rejection_reason: set only together with status `rejected`.

## Enums
```php
enum ReviewStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
```

## Notes
- Public responses never include candidate_id or the candidate's name. The author is shown as "Verified candidate" (BR-42). Only the admin queue (`GET /api/v1/admin/reviews`) shows `candidate_name`.
- The company rating is computed on read from approved rows (BR-43). Nothing is denormalized onto `companies`, and `GET /api/v1/companies/{slug}` is unchanged (HIRE-4 MNC-1, decision D1).
- Moderation state lives on this table rather than in a separate moderation table (decision D2).
