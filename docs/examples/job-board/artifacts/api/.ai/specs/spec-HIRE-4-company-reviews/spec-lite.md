---
id: spec-HIRE-4-company-reviews
title: Company reviews with moderation
type: feature
size: M
priority: P2
status: done
ticket: HIRE-4
stakeholders: [Maya Chen]
approved_by: Maya Chen
approved_at: 2026-10-22T09:40:00Z
created: 2026-10-22
stacks: [laravel, nextjs]
---

# Company reviews with moderation

## Summary
Candidates rate and review companies, and an admin moderates every review before anyone else
sees it. Job seekers get employer ratings they can trust: one review per candidate per company,
no anonymous drive-by posts, and nothing public until a human has read it. The work adds one
table, six API endpoints, a public reviews page and an admin moderation queue.

## Context
- **Problem**: HIRE-4 ("Candidates can rate and review companies; reviews are moderated; one
  review per candidate per company"). Hireboard shows companies but gives job seekers no signal
  about what working there is like. The rules were agreed with Maya Chen at the start
  (BR-40..BR-43 in `docs/context/business-rules.md`) and have not been implemented yet.
- **User impact**: visitors see an average rating and approved reviews per company. Candidates
  can share their experience without exposing their identity. Admins keep abusive or identifying
  content off the site.

## Scope
### In scope
- `company_reviews` table, `ReviewStatus` enum, `CompanyReview` model and factory (schema doc first).
- API: submit a review, read your own review, public list with average rating, admin queue
  (pending reviews only, oldest first, paginated, each with `candidate_name` and the company name
  and slug; non-admins get 403, see AC-10), approve, reject.
- Web: `/companies/[slug]/reviews` (public list, `ReviewForm` for candidates, status card when
  the candidate already has a review) and `/admin/reviews` (moderation queue).
- Contract docs: `docs/api/api-contracts.md` and `web/lib/api/endpoints.ts`.
### Out of scope
- Editing, deleting or resubmitting a review after submission or after a decision (BR-44).
- Employer replies to reviews.
- Moderation by employers, or any employer view of reviews beyond the public list.
- Requiring an application to the company before reviewing (clarity gate Q2).
- Rating fields on `GET /api/v1/companies/{slug}` (see MNC-1 and decisions.md D1).
- Notifications to the candidate when a review is decided.

## Must NOT change
- **MNC-1**: The `GET /api/v1/companies/{slug}` response shape is unchanged (no review fields are added).
- **MNC-2**: `GET /api/v1/jobs` and the `/jobs` page are unchanged.
- **MNC-3**: The `GET /api/v1/auth/me` shape and role semantics are unchanged.

## Acceptance criteria
- **AC-1**: WHEN an authenticated candidate submits a review (rating 1-5, title 5-120 chars,
  body 20-2000 chars) for an existing company THE SYSTEM SHALL store it with status pending and
  respond 201 with status "pending".
- **AC-2**: IF the candidate already has a review for that company in any status THEN THE SYSTEM
  SHALL respond 409 with code review_already_exists.
- **AC-3**: IF the authenticated user is an employer or admin THEN THE SYSTEM SHALL respond 403
  to a review submission.
- **AC-4**: IF rating, title or body is invalid THEN THE SYSTEM SHALL respond 422 with field errors.
- **AC-5**: WHEN a guest submits a review THE SYSTEM SHALL respond 401.
- **AC-6**: WHEN anyone requests a company's reviews THE SYSTEM SHALL return only approved
  reviews, newest first, paginated, with author "Verified candidate" and no candidate id or name.
- **AC-7**: THE SYSTEM SHALL return meta.average_rating as the mean of approved ratings rounded
  half-up to 1 decimal, or null when there are none.
- **AC-8**: WHEN an admin approves a pending review THE SYSTEM SHALL set status approved,
  moderated_by and moderated_at, and the review SHALL appear in the public list.
- **AC-9**: WHEN an admin rejects a pending review with a 5-255 char reason THE SYSTEM SHALL set
  status rejected and store the reason. The review SHALL never appear publicly, and the candidate
  SHALL see status and reason via /reviews/mine.
- **AC-10**: IF the review is not pending THEN approve and reject SHALL respond 409
  review_already_moderated. IF the user is not an admin THEN they SHALL respond 403.
- **AC-11**: WHEN a signed-in candidate without a review opens /companies/{slug}/reviews THE page
  SHALL show ReviewForm, and after submitting it SHALL show "Thanks - your review is awaiting
  moderation." With an existing review, the page SHALL show its status instead of the form
  (manual-test.md#step-3, #step-4).

## Boundaries
- **Always**: a Pest feature test per AC; service-repository with DTOs (INV-02); update
  `docs/api/api-contracts.md` and `web/lib/api/endpoints.ts` (INV-06); responses in the INV-01
  envelope; error codes from the contract list.
- **Ask first**: any change to the `companies` or `users` tables; a new dependency; any change to
  the company show payload.
- **Never**: expose candidate identity publicly; weaken or delete existing tests; touch auth flows
  (registration, login, tokens, middleware).

## Technical context
- **Related code**:
  - `app/Contracts/CompanyRepositoryInterface.php` — `findBySlug()` resolves the company (returns null when unknown).
  - `app/Services/CompanyService.php`, `app/DTOs/CompanyDTO.php` — the company show payload MNC-1 protects.
  - `app/Models/User.php` — `isCandidate()`, `isAdmin()`; `app/Enums/UserRole.php`.
  - `app/Policies/` — empty so far; policies are auto-discovered by model name and called with
    `$this->authorize()` from invokable controllers (base `Controller` uses `AuthorizesRequests`).
  - `bootstrap/app.php` — renders `BusinessRuleException` subclasses, validation, 401 and 403
    in the INV-01 error envelope.
  - `routes/api.php` — loads every `routes/api/v1/*.php`; this spec adds `reviews.php`.
  - web: `lib/api/client.ts` (`apiFetch`, `ApiError`), `lib/session.ts` (`getCurrentUser`,
    `requireUser`, `getSessionToken`), `app/(account)/layout.tsx` (role nav already links
    admins to `/admin/reviews`), `middleware.ts` (matcher already covers `/admin/:path*`).
- **Already implemented** (do not rebuild):
  - Company lookup by slug and the `company_not_found` error (HIRE-1).
  - Roles, Sanctum tokens and the seeded admin `admin@hireboard.test` (HIRE-3).
  - The account layout already shows admins a "Review queue" link to `/admin/reviews`, and the
    middleware matcher already covers `/admin/:path*` (HIRE-3). The link 404s today.
  - Nothing review-related exists yet: no table, model, routes or registry entries
    (`git log --oneline -20` and `git grep -i review` in both repos).
- **Approach**: schema doc → migration → enum/model/factory, then `CompanyReviewService`
  (submit, listApproved, averageRating, findMine, listPending, approve, reject) over
  `CompanyReviewRepositoryInterface`. One output DTO with three serializers (public, owner,
  moderation) so identity can only leak through a deliberate method choice. Policy
  `CompanyReviewPolicy` (create: candidate, moderate: admin). Web pages are Server Components;
  the form uses a Server Action with `useActionState` and maps API error codes to messages.
- **Repos**: `api/` (Laravel 12) then `web/` (Next.js 15). Workspace root `~/work/hireboard`.

## Decisions
See [decisions.md](decisions.md): D1 rating summary in list meta, D2 status column, D3 unique
index plus pre-check.

## Open questions
- [x] Q1: Can a candidate edit or resubmit a review after it is rejected? — **Accepted
  assumption**: no. Moderation is final in v1, and the one-review rule (AC-2) applies whatever the
  status. Recorded as BR-44 in `docs/context/business-rules.md`.
- [x] Q2: Must the candidate have applied to the company before reviewing it? — **Answered**
  (Maya Chen): no, not for v1. Any candidate may review any company. Added to Out of scope.
- [x] Q3: What does "anonymous" mean for the public list and for admins? — **Answered** (Maya
  Chen): the public author is always "Verified candidate", with no candidate id or name. Admins
  see `candidate_name` in the queue. Folded into AC-6.
- [x] Q4: How is the average rounded, and what is shown with no reviews? — **Answered** (Maya
  Chen): one decimal, half-up, and null when there are no approved reviews. Folded into AC-7.
- [x] Q5: Do pending or rejected reviews count toward the average or the total? — **Answered**
  (Maya Chen): no, approved only. Folded into AC-6 and AC-7.
- [x] Q6: Who creates admin accounts? — **Accepted assumption**: admins are seeded only
  (`DemoUserSeeder`), never self-registered (BR-01). No admin management UI in this spec.

## Dependencies
- **Requires**: spec-HIRE-3-accounts-and-roles (roles, Sanctum tokens, session cookie, account
  layout, `requireUser`).
- **Blocks**: HIRE-7 careers page (reads `meta.average_rating` and `meta.total`).

---
Next: `/sdd spec-HIRE-4-company-reviews` (approval → build) or `/execute-task --spec=HIRE-4`
