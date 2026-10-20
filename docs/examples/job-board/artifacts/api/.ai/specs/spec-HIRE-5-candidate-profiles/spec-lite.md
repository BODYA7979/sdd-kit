---
id: spec-HIRE-5-candidate-profiles
title: Candidate profiles
type: feature
size: M
priority: P1
status: done
ticket: HIRE-5
stakeholders: [Maya Chen]
approved_by: Maya Chen
approved_at: 2026-10-23T08:30:00Z
created: 2026-10-23
stacks: [laravel, nextjs]
---

# Candidate profiles

## Summary
Candidates create and edit one private profile (headline, location, bio, skills, years of experience, open to work). The profile is the prerequisite for applying to jobs in HIRE-6 (BR-30), so it ships first. Only the owner reads or writes it.

## Context
- **Problem**: Candidates can register and sign in (HIRE-3), but there is nowhere to describe who they are, and HIRE-6 needs a profile headline to show employers.
- **User impact**: Candidates get a profile page under their account. Employers later see name, email and headline through applications only (BR-21).

## Scope
### In scope
- `candidate_profiles` table (schema doc first), model, factory.
- `GET /api/v1/me/profile` and `PUT /api/v1/me/profile` (upsert), candidate-only.
- Web: `/profile` page with `ProfileForm` and `saveProfileAction`.
### Out of scope
- Public or employer-facing profile pages, avatars, CV upload, profile search.
- Showing the profile to employers (HIRE-6 exposes only name, email and headline).

## Must NOT change
- **MNC-1**: `GET /api/v1/auth/me` response shape (`{id, name, email, role}`) and role semantics are unchanged.
- **MNC-2**: Public endpoints (`GET /api/v1/jobs`, `GET /api/v1/jobs/{id}`, `GET /api/v1/companies/{slug}`) stay tokenless with unchanged shapes.

## Acceptance criteria
- **AC-1**: WHEN an authenticated candidate without a profile requests `GET /api/v1/me/profile` THE SYSTEM SHALL respond 404 with code `profile_not_found`.
- **AC-2**: WHEN an authenticated candidate sends a valid `PUT /api/v1/me/profile` THE SYSTEM SHALL create the profile if none exists or replace it otherwise, respond 200 with the CandidateProfile shape `{id, headline, location, bio, skills[], years_experience, open_to_work, updated_at}`, and a following GET SHALL return the same data.
- **AC-3**: IF headline is not 3-120 chars, OR skills has more than 20 items, an item longer than 40 chars, or two items equal ignoring case, OR years_experience is not an integer 0-60 THEN THE SYSTEM SHALL respond 422 `validation_failed` with field errors and store nothing.
- **AC-4**: IF the authenticated user is an employer or admin THEN THE SYSTEM SHALL respond 403 `forbidden` to both profile endpoints.
- **AC-5**: WHEN a guest calls either profile endpoint THE SYSTEM SHALL respond 401 `unauthenticated`.
- **AC-6**: WHEN a signed-in candidate opens `/profile` THE page SHALL pre-fill the form with the saved profile (empty form plus a "You need a profile before you can apply" note when there is none), and after a valid save SHALL show "Profile saved". Invalid input SHALL show the API's message next to the field.

## Boundaries
- **Always**: a Pest feature test per API AC; service-repository + DTOs (INV-02); schema doc before the migration; add the two routes to `api/docs/api/api-contracts.md` and `web/lib/api/endpoints.ts` (INV-06).
- **Ask first**: any change to the `users` table or `User` model; a new dependency; exposing any profile field outside `/me/profile`.
- **Never**: an endpoint that takes a profile id or user id; returning `user_id`; weakening existing tests; touching auth flows.

## Technical context
- **Related code**: `app/Http/Controllers/Auth/*` (HIRE-3 controller shape), `app/Policies/CompanyReviewPolicy.php` (HIRE-4 role policy), `app/DTOs/SubmitCompanyReviewDTO.php` (validated input DTO), `web/app/companies/[slug]/reviews/actions.ts` (422 to field-error mapping).
- **Already implemented**: Sanctum auth, `UserRole`, `User::isCandidate()`, `requireUser()` and the `(account)` layout, middleware matcher `/profile/:path*` (all HIRE-3).
- **Approach**: `ShowMyProfileController` / `UpsertMyProfileController` → `CandidateProfileService` → `CandidateProfileRepositoryInterface` (`findByUserId`, `upsertForUser`). `CandidateProfilePolicy::manage` gates by role. The profile is always resolved from the authenticated user.
- **Repos**: backend `api/`, frontend `web/` (workspace `~/work/hireboard`).

## Decisions
1. `PUT` upsert instead of separate POST/PATCH: one form, one endpoint, idempotent. The first save creates the row.
2. Skills are a JSON column, not a `skills` table: no search by skill in v1. Revisit when employers filter candidates.

## Open questions
- [x] Q1: Are "PHP" and "php" the same skill, and is a duplicate silently merged or rejected? — **Answered (Maya Chen)**: same skill. Values are trimmed and compared case-insensitively, and a duplicate is rejected with 422 on that item (`skills.N`). Folded into AC-3.
- [x] Q2: Can an employer read a candidate's profile directly, e.g. from an application? — **Answered**: no. Per BR-21 there is no employer-facing profile endpoint. HIRE-6 shows name, email and headline inside the application only. Folded into Scope and Boundaries.

## Dependencies
- **Requires**: spec-HIRE-3-accounts-and-roles (done).
- **Blocks**: spec-HIRE-6-job-applications (BR-30 `profile_required`).

---
Next: `/sdd spec-HIRE-5-candidate-profiles` (approval → build) or `/execute-task --spec=HIRE-5`
