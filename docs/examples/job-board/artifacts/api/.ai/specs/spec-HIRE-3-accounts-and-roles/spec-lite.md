---
id: spec-HIRE-3-accounts-and-roles
title: Accounts and roles
type: feature
size: M
priority: P1
status: done
ticket: HIRE-3
stakeholders: [Maya Chen]
approved_by: Maya Chen
approved_at: 2026-10-21T08:55:00Z
created: 2026-10-21
stacks: [laravel, nextjs]
---

# Accounts and roles

## Summary
Candidates and employers register and sign in; an employer registers together with their company.
Every later feature (reviews, profiles, applications) needs to know who the user is and which role
they have, so this ships first. Authentication follows ADR-0001: the API issues Sanctum personal
access tokens, and the Next.js server keeps them in the HttpOnly `hireboard_session` cookie.

## Context
- **Problem**: Hireboard has a public job search (HIRE-1) and no accounts. HIRE-4, HIRE-5 and HIRE-6
  are blocked on a user identity and role. The auth approach is decided (ADR-0001, accepted 2026-10-20).
- **User impact**: candidates and employers get an account and a dashboard. Guests keep browsing jobs
  without signing in.

## Scope
### In scope
- `role` column on `users` (schema doc first), `UserRole` enum, role helpers on `User`, factory states.
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- Employer registration creates the employer's company (BR-02).
- Demo accounts in `DemoUserSeeder` (candidate, employer owning Acme Robotics, admin).
- Web: `/login`, `/register`, `/dashboard`, the `(account)` layout with role-based navigation and
  sign-out, `middleware.ts`, `lib/session.ts`.
### Out of scope
- Email verification, password reset, "remember me", social login.
- Admin user management (admins are seeded only, BR-01).
- Refresh or sliding token expiry (deferred in ADR-0001).
- Editing the company created at registration (HIRE-11 area).

## Must NOT change
- **MNC-1**: `GET /api/v1/jobs`, `GET /api/v1/jobs/{id}` and `GET /api/v1/companies/{slug}` stay public
  (no token needed) with unchanged response shapes.
- **MNC-2**: `/jobs` renders for guests without a redirect to `/login`.

## Acceptance criteria
- **AC-1**: WHEN a visitor registers with role `candidate`, a name, a valid unused email and a confirmed
  password of 8+ chars THE SYSTEM SHALL create the user and respond 201 with `{user, token}` where
  `user.role` is `candidate`.
- **AC-2**: WHEN a visitor registers with role `employer` and a `company_name` of 2-120 chars THE SYSTEM
  SHALL create the user and one company owned by them, with slug `Str::slug(company_name)` and `-2`,
  `-3` ... appended while the slug is taken (BR-02). IF `company_name` is missing THEN THE SYSTEM SHALL
  respond 422.
- **AC-3**: IF the requested role is `admin` (or anything other than `candidate`/`employer`) THEN THE
  SYSTEM SHALL respond 422 `validation_failed` with an error on `role` and create nothing (BR-01).
- **AC-4**: IF the email is already registered, compared case-insensitively, THEN THE SYSTEM SHALL
  respond 422 `validation_failed` with an error on `email` (BR-03).
- **AC-5**: WHEN a user logs in with a valid email (any case) and password THE SYSTEM SHALL respond 200
  with `{user, token}`; the token is named `web` and expires after 7 days (BR-04).
- **AC-6**: IF the email is unknown or the password is wrong THEN THE SYSTEM SHALL respond 422 with code
  `invalid_credentials` and the same message in both cases.
- **AC-7**: WHEN a signed-in user logs out THE SYSTEM SHALL revoke the token used for that request,
  respond 204, and a later `GET /api/v1/auth/me` with that token SHALL respond 401. Other tokens of the
  same user stay valid.
- **AC-8**: WHEN a signed-in user requests `GET /api/v1/auth/me` THE SYSTEM SHALL respond 200 with exactly
  `{id, name, email, role}`.
- **AC-9**: IF more than 6 requests to `POST /api/v1/auth/login` and `POST /api/v1/auth/register`
  combined arrive from one client within a minute THEN THE SYSTEM SHALL respond 429
  `too_many_requests`. Both routes deliberately share one `throttle:6,1` bucket per client, so the
  limit is verified on login.
- **AC-10**: WHEN a user signs in on `/login` THE web app SHALL set the HttpOnly `hireboard_session`
  cookie (SameSite=Lax, 7 days) and redirect to `/dashboard` (or the `next` path); the token SHALL NOT
  be readable from browser JavaScript.
- **AC-11**: WHEN a guest opens `/dashboard` THE web app SHALL redirect to `/login?next=/dashboard`.

## Boundaries
- **Always**: a Pest feature test per API AC; service-repository + DTOs (INV-02); schema doc before the
  migration; add the auth routes to `api/docs/api/api-contracts.md` and `web/lib/api/endpoints.ts` (INV-06);
  every web call through `lib/api/client.ts`.
- **Ask first**: any change to existing `users` columns beyond adding `role`; a new dependency (Sanctum is
  already installed by `install:api`); changing a public endpoint; touching `config/sanctum.php`.
- **Never**: return the token to browser JavaScript or store it in `localStorage` (INV-05); expose
  `NEXT_PUBLIC_` API URLs; allow admin self-registration; weaken an existing test.

## Technical context
- **Related code**: `app/Http/Controllers/Jobs/*` and `app/Services/JobPostingService.php` (controller →
  service → repository shape from HIRE-1), `app/Repositories/CompanyRepository.php` (gains
  `createForOwner` with BR-02 slug suffixing), `bootstrap/app.php` (error envelope incl. 401/429),
  `web/lib/api/client.ts` (`token` option), `docs/adr/0001-spa-auth.md`.
- **Already implemented**: Sanctum (installed by `php artisan install:api`, `personal_access_tokens`
  migration present); `CompanyRepository::findBySlug`; the 401 and 429 envelopes in `bootstrap/app.php`;
  the `token` option of `apiFetch`. **Missing**: `HasApiTokens` and a role on `User`, the auth routes,
  `CompanyRepositoryInterface::createForOwner`, the auth entries in `web/lib/api/endpoints.ts`, any web
  session code.
- **Approach**: `RegisterController` / `LoginController` / `LogoutController` / `ShowCurrentUserController`
  → `AuthService` → `UserRepositoryInterface` (`create`, `verifyCredentials`, `issueToken`, `revokeToken`)
  and `CompanyRepositoryInterface::createForOwner`. Web: `loginAction` / `registerAction` call the API,
  store the token with `setSessionToken`, and redirect. `middleware.ts` checks cookie presence;
  `requireUser()` checks the token and the role on the server.
- **Repos**: backend `api/`, frontend `web/` (workspace `~/work/hireboard`).

## Decisions
1. Token lifetime is set per token at creation (`createToken('web', ['*'], now()->addDays(7))`) rather
   than in `config/sanctum.php`, so the rule lives next to the code that issues tokens (ADR-0001).
2. Logout revokes the token found from the request's bearer value, which keeps Eloquent models out of
   `AuthService`.
3. Invalid credentials are a 422 with a dedicated code, not a 401, so the login form can tell "wrong
   password" apart from "session expired".

## Open questions
- [x] Q1: Is email verification required before a user can sign in or apply? — **Accepted assumption**:
  out of scope for v1. `email_verified_at` stays unused.
- [x] Q2: What is the password rule? — **Answered (Maya Chen)**: minimum 8 characters, confirmed. No
  complexity rules in v1. Folded into AC-1.
- [x] Q3: How long does a session last, and does logout end all sessions? — **Answered**: 7 days per
  ADR-0001 and BR-04; logout revokes only the current token. Folded into AC-5 and AC-7.
- [x] Q4: Which employer owns the seeded Acme Robotics company? — **Answered**: `employer@acme.test`
  ("Erin Employer"), attached by `DemoUserSeeder`.

## Dependencies
- **Requires**: ADR-0001 (accepted), HIRE-1 (companies table and `CompanyRepository`).
- **Blocks**: spec-HIRE-4-company-reviews, spec-HIRE-5-candidate-profiles, spec-HIRE-6-job-applications.

---
Next: `/sdd spec-HIRE-3-accounts-and-roles` (approval → build) or `/execute-task --spec=HIRE-3`
