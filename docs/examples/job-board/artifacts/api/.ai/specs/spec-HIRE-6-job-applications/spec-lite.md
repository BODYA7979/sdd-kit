---
id: spec-HIRE-6-job-applications
title: Job applications
type: feature
size: M
priority: P1
status: done
ticket: HIRE-6
stakeholders: [Maya Chen]
approved_by: Maya Chen
approved_at: 2026-10-24T09:05:00Z
created: 2026-10-24
stacks: [laravel, nextjs]
---

# Job applications

## Summary
Candidates apply to open job postings with an optional cover letter, and employers see who
applied to their own company's jobs. This closes the loop the job board exists for: until now a
visitor could find a job but had no way to act on it.

## Context
- **Problem**: HIRE-6 (pasted into `/sdd`, no tracker connected): "Candidates apply to open jobs
  with an optional cover letter; employers see applicants for their own jobs". The job detail
  page already links "Apply" to `/jobs/[id]/apply`, which is a 404 today.
- **User impact**: candidates can apply without leaving Hireboard; employers get one list of
  applicants with the contact details they need. The data is personal (name, email, headline,
  cover letter), so access rules matter as much as the happy path.
- **Rules**: BR-21, BR-30, BR-31, BR-32 and BR-33 in `docs/context/business-rules.md`. They were
  recorded and validated with the product brief, so this spec adds no new business rule.

## Scope
### In scope
- `POST /api/v1/jobs/{id}/applications` for candidates with a profile.
- `GET /api/v1/me/applications` (the candidate's own list) and
  `GET /api/v1/employer/applications` (applications to the employer's company).
- Web: `/jobs/[id]/apply` with `ApplyForm`, `/applications` for candidates,
  `/employer/applications` for employers.
### Out of scope
- Withdrawing or editing an application (clarity gate Q2).
- Application status workflow (shortlisted, rejected) and notifications or emails.
- File uploads (CV attachments).
- Employers publishing or closing postings (HIRE-11).

## Must NOT change
- **MNC-1**: The `GET /api/v1/jobs/{id}` response shape is unchanged (no application fields are added).
- **MNC-2**: Guests can still view the job detail page `/jobs/[id]` without signing in.

## Acceptance criteria
- **AC-1**: WHEN a candidate with a profile submits an application to an open job, with an
  optional `cover_letter` of at most 2000 characters, THE SYSTEM SHALL store it and respond 201
  with the candidate's view of the application.
- **AC-2**: IF the candidate has no profile THEN THE SYSTEM SHALL respond 422 with code
  `profile_required` (BR-30).
- **AC-3**: IF the job exists but is not open (draft or closed) THEN THE SYSTEM SHALL respond
  422 with code `job_not_open` (BR-31).
- **AC-4**: IF the candidate already applied to that job THEN THE SYSTEM SHALL respond 409 with
  code `already_applied`, including when two submissions race each other (BR-32).
- **AC-5**: IF the user is not a candidate THEN THE SYSTEM SHALL respond 403. IF the job id is
  unknown THEN THE SYSTEM SHALL respond 404 with code `job_not_found`.
- **AC-6**: WHEN a candidate requests `GET /api/v1/me/applications` THE SYSTEM SHALL return only
  their own applications, newest first, paginated (`per_page` 1-50, default 20).
- **AC-7**: WHEN an employer requests `GET /api/v1/employer/applications` THE SYSTEM SHALL return
  only applications to postings of the company they own, including closed postings, each with
  the candidate's name, email and headline and nothing else from the profile (BR-21, BR-33),
  newest first, paginated (`per_page` 1-50, default 20).
- **AC-8**: WHEN a signed-in candidate submits `ApplyForm` on `/jobs/[id]/apply` THE page SHALL
  redirect to `/applications` with the banner "Application sent. The employer can now see it."
  WHEN the API answers `profile_required` THE form SHALL show a banner linking to `/profile`
  (manual-test.md#step-2, #step-3).

## Boundaries
- **Always**: a Pest feature test per API acceptance criterion; invokable controller, service,
  DTOs and a repository behind `App\Contracts`; register the new endpoints in
  `docs/api/api-contracts.md` and `web/lib/api/endpoints.ts`; schema doc before the migration.
- **Ask first**: any change to `users`, `companies`, `job_postings` or `candidate_profiles`;
  a new dependency; any change to the job show payload.
- **Never**: return candidate data from a public endpoint; let an employer read another
  company's applications; expose profile fields beyond name, email and headline; weaken or
  delete existing tests; touch the auth flow.

## Technical context
- **Related code**: `app/Services/JobPostingService.php` and
  `app/Contracts/JobPostingRepositoryInterface.php` (`findById()` finds a posting in any status,
  which the apply flow needs to tell 404 from `job_not_open`), `app/Models/CandidateProfile.php`
  (HIRE-5), `app/Policies/CandidateProfilePolicy.php` (policy pattern),
  `web/app/jobs/[id]/page.tsx` (the existing Apply link), `web/middleware.ts` (its matcher
  already lists `/applications/:path*`, `/employer/:path*` and `/jobs/:id/apply`).
- **Already implemented**: the middleware matcher entries above and the account layout's
  "Applications" nav links for candidates and employers (HIRE-3). Do not rebuild them.
- **Approach**: one `job_applications` table with a unique `(job_posting_id, candidate_id)`
  index. `JobApplicationService::submit()` checks found, open, profile and duplicate, in that
  order. The employer list is scoped in the query by `companies.owner_id`, not filtered after
  fetching. `JobApplicationDTO` has two outputs: `toApiArray()` for the candidate and
  `toEmployerArray()` for the employer.
- **Repos**: backend `api/`, frontend `web/` (workspace `~/work/hireboard`).

## Open questions
- [x] Q1: Does the employer list include applications to closed postings? — **Answered**: yes,
  closed postings stay visible to the owning employer (BR-33).
- [x] Q2: Can a candidate withdraw or edit an application? — **Accepted assumption**: no, out of
  scope for v1. One application per posting stays final (BR-32).
- [x] Q3: Does the employer see the candidate's email, or only the name? — **Answered**: name,
  email and headline, and nothing else from the profile (BR-21).

## Dependencies
- **Requires**: HIRE-3 (accounts and roles), HIRE-5 (candidate profiles).
- **Blocks**: HIRE-11 (employers publish and close postings).

---
Next: `/sdd spec-HIRE-6-job-applications` (approval → build) or `/execute-task --spec=HIRE-6`
