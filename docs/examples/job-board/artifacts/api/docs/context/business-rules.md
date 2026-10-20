# Hireboard business rules

The rules the system must enforce. Specs, tests and reviews cite them by ID. Rules are
grouped by area and numbered with gaps (0x accounts, 1x postings, 2x profiles,
3x applications, 4x reviews), so a new rule never renumbers an old one.

**Validated by:** Maya Chen (product owner), 2026-10-19, from the draft in `product-brief.md`.
A rule enters this file only after Maya has confirmed it. Anything else is an assumption, and
write-spec's clarity gate treats it as one. To change a rule, ask Maya first, then update the
specs that cite it.

## Accounts (0x)

| ID | Rule | Enforced in | Since |
|----|------|-------------|-------|
| BR-01 | Self-registration roles are `candidate` or `employer`. Requesting `admin` returns 422. Admins are seeded only. | `RegisterUserDTO` validation | HIRE-3 |
| BR-02 | Employer registration creates exactly one company owned by that employer. The slug is `Str::slug(company_name)`, with `-2`, `-3` ... appended when taken. | `AuthService::register()`, `CompanyRepository::createForOwner()` | HIRE-3 |
| BR-03 | Emails are unique, compared and stored lowercase. | `RegisterUserDTO`, `UserRepository` | HIRE-3 |
| BR-04 | API tokens (Sanctum personal access tokens, name `web`) expire after 7 days. Logout revokes the current token. | `UserRepository::issueToken()`, `revokeToken()` | HIRE-3, ADR-0001, confirmed by Maya Chen 2026-10-20 (ADR-0001 sign-off) |

## Job postings (1x)

| ID | Rule | Enforced in | Since |
|----|------|-------------|-------|
| BR-10 | Only `open` postings appear in search and detail. Draft and closed postings are never public (404 `job_not_found`). | `JobPostingRepository::searchOpen()`, `findOpenById()` | HIRE-1, fixed for detail in HIRE-9 |
| BR-11 | Search returns newest published first. `per_page` is 1-50, default 20. | `JobPostingRepository::searchOpen()`, `JobPostingService::search()` | HIRE-1 |
| BR-12 | Salary is optional, annual, in whole currency units with an ISO currency. When present, `salary_min <= salary_max`. | not enforced in v1: no write path for postings until HIRE-11 (seeder and factory respect it) | HIRE-1 |

## Candidate profiles (2x)

| ID | Rule | Enforced in | Since |
|----|------|-------------|-------|
| BR-20 | One profile per candidate. Only candidates have profiles. | unique `candidate_profiles.user_id`, `CandidateProfilePolicy` | HIRE-5 |
| BR-21 | A profile is private to its owner. Employers see only name, email and headline, and only through applications to their own jobs. | `CandidateProfilePolicy`, `JobApplicationDTO::toEmployerArray()` | HIRE-5, HIRE-6 |

## Applications (3x)

| ID | Rule | Enforced in | Since |
|----|------|-------------|-------|
| BR-30 | A candidate needs a profile before applying (422 `profile_required`). | `JobApplicationService::submit()` | HIRE-6 |
| BR-31 | Only open postings accept applications (422 `job_not_open`). | `JobApplicationService::submit()` | HIRE-6 |
| BR-32 | One application per candidate per posting (409 `already_applied`), also under a concurrent duplicate insert. | unique index, `JobApplicationRepository::create()` | HIRE-6 |
| BR-33 | Employers see applications only for their own company's postings, including closed ones. | `JobApplicationPolicy`, `JobApplicationRepository` | HIRE-6 |

## Reviews (4x)

| ID | Rule | Enforced in | Since |
|----|------|-------------|-------|
| BR-40 | Only candidates can review a company. Each candidate gets one review per company, whatever its status (409 `review_already_exists`). | `CompanyReviewPolicy::create()`, unique index, `CompanyReviewService::submit()` | HIRE-4 |
| BR-41 | New reviews are `pending`. Only admins approve or reject them. Rejecting requires a reason of 5-255 characters. | `CompanyReviewPolicy::moderate()`, `RejectReviewDTO` | HIRE-4 |
| BR-42 | Only approved reviews are public. The author is always shown as "Verified candidate"; admins see the candidate's name. | `CompanyReviewDTO::toApiArray()`, `toModerationArray()` | HIRE-4 |
| BR-43 | Company rating is the mean of approved ratings, rounded half-up to 1 decimal, or `null` when there are none. | `CompanyReviewService::averageRating()` | HIRE-4 |
| BR-44 | Moderation is final in v1: no edit or resubmission after a decision. | `CompanyReviewService` (no update path) | HIRE-4 clarity gate (Q1), confirmed by Maya Chen 2026-10-22 |

## Related

- Invariants INV-01..INV-07: `CLAUDE.md` (this repo) and the workspace `CLAUDE.md`.
- Request and response shapes: `docs/api/api-contracts.md`.
- Tables: `docs/schemas/*.md`.
