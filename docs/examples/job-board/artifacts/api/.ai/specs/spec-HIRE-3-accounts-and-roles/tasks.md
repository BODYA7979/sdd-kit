# Accounts and roles — Tasks

**Spec**: spec-HIRE-3-accounts-and-roles | **Size**: M | **Tasks**: 6 (5 planned + 1 converge gap)

## Phase 1: Backend (api/)

- [x] 1. Schema doc, role migration, UserRole, User and UserFactory (laravel)
  - Covers: scaffolding for AC-1..AC-8
  - [x] 1.1 Update `docs/schemas/users.md` first (schema-first): `role` string(20), default `candidate`, indexed
  - [x] 1.2 Migration `2026_10_21_090000_add_role_to_users_table` (additive, default, `down()` drops the index first)
  - [x] 1.3 `App\Enums\UserRole`; `User` gets `HasApiTokens`, the `role` cast and `isCandidate()` / `isEmployer()` / `isAdmin()`
  - [x] 1.4 `UserFactory` states `candidate()`, `employer()`, `admin()`
  - [x] 1.5 **Verify**: `php artisan migrate:fresh` locally; existing tests green; gates green

- [x] 2. Auth endpoints, AuthService, DTOs and tests (laravel)
  - Covers: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, MNC-1
  - [x] 2.1 Failing Pest tests in `tests/Feature/Auth/` (`RegisterTest`, `LoginTest`, `LogoutTest`), one per AC
  - [x] 2.2 Guard test `PublicEndpointsGuardTest`: job search, job detail and company profile without a token, shapes unchanged
  - [x] 2.3 DTOs `RegisterUserDTO` (`required_if:role,employer` for `company_name`, email lowercased before `unique`), `LoginDTO`, `UserDTO`, `AuthResultDTO`
  - [x] 2.4 `UserRepositoryInterface` + `UserRepository` (`create`, `verifyCredentials`, `issueToken`, `revokeToken`), bound in `RepositoryServiceProvider`
  - [x] 2.5 `CompanyRepositoryInterface::createForOwner` with BR-02 slug suffixing
  - [x] 2.6 `AuthService` (register in one transaction), `InvalidCredentialsException`
  - [x] 2.7 Four invokable controllers + `routes/api/v1/auth.php`; auth section in `docs/api/api-contracts.md`
  - [x] 2.8 **Verify**: new tests green; `SearchJobPostingsTest`, `ShowJobPostingTest`, `ShowCompanyTest` unchanged and green; gates green

- [x] 3. Demo accounts in DemoUserSeeder (laravel)
  - Covers: scaffolding (preconditions of manual-test.md)
  - [x] 3.1 `DemoUserSeeder`: candidate@hireboard.test, employer@acme.test (owns `acme-robotics`), admin@hireboard.test, password `password`
  - [x] 3.2 `DatabaseSeeder` calls `JobBoardSeeder` then `DemoUserSeeder`
  - [x] 3.3 **Verify**: `php artisan migrate:fresh --seed`; `curl -X POST localhost:8000/api/v1/auth/login` with each account returns 200

## Phase 2: Frontend (web/)

- [x] 4. Session helpers and auth fetchers (nextjs)
  - Covers: AC-10 (data layer)
  - [x] 4.1 `types/api/auth.ts` mirrors `UserDTO` / `AuthResultDTO` (`UserRole` literals match the enum)
  - [x] 4.2 `register`, `login`, `logout`, `me` in `lib/api/endpoints.ts`; `lib/api/auth.ts`
  - [x] 4.3 `lib/session.ts`: `SESSION_COOKIE`, cookie flags (HttpOnly, SameSite=Lax, Secure in production, 7 days), `getCurrentUser()` (null on 401), `requireUser(roles?)`
  - [x] 4.4 **Verify**: web gates green

- [x] 5. Login and register pages, middleware, account layout and dashboard (nextjs)
  - Covers: AC-10, AC-11, MNC-2
  - [x] 5.1 `app/(auth)/actions.ts` `loginAction` / `registerAction`: API error codes mapped to form messages; `next` limited to same-site paths
  - [x] 5.2 `LoginForm`, `RegisterForm` (company name shown for employers), `/login`, `/register`
  - [x] 5.3 `middleware.ts` matcher for account pages (plus the later `/jobs/:id/apply`), redirect to `/login?next=<path>`
  - [x] 5.4 `(account)/layout.tsx` with `requireUser()`, role-based nav and sign-out (`logoutAction`); `/dashboard`
  - [x] 5.5 **Verify**: web gates green; `npm run build` (new routes)

## Phase: Gaps (converge round 1)

- [x] 6. Throttle register and login (laravel)
  - Covers: AC-9
  - Reason: AC-9 has no implementation and no test; `routes/api/v1/auth.php` has no rate limit on `/register` or `/login`
  - [x] **Verify**: `tests/Feature/Auth/LoginTest.php::throttles repeated login attempts` fails first, then passes with `throttle:6,1` on both routes (7th attempt → 429 `too_many_requests`); gates green

## Traceability

| ID | Criterion (short) | Verified by | Kind | Task |
|----|-------------------|-------------|------|------|
| AC-1 | candidate registers, 201 + token | `tests/Feature/Auth/RegisterTest.php::registers a candidate and returns a token` | test | 2 |
| AC-2 | employer registers with company, unique slug | `tests/Feature/Auth/RegisterTest.php::registers an employer together with a new company` | test | 2 |
| AC-3 | admin role refused with 422 | `tests/Feature/Auth/RegisterTest.php::refuses admin self-registration` | test | 2 |
| AC-4 | duplicate email refused, case-insensitive | `tests/Feature/Auth/RegisterTest.php::rejects a duplicate email regardless of case` | test | 2 |
| AC-5 | valid login, 200 + 7-day token | `tests/Feature/Auth/LoginTest.php::logs in with valid credentials` | test | 2 |
| AC-6 | invalid login, 422 invalid_credentials | `tests/Feature/Auth/LoginTest.php::rejects invalid credentials` | test | 2 |
| AC-7 | logout revokes the current token only | `tests/Feature/Auth/LogoutTest.php::revokes the current token` | test | 2 |
| AC-8 | /me returns {id, name, email, role} | `tests/Feature/Auth/LoginTest.php::returns the current user` | test | 2 |
| AC-9 | login throttled to 6/min | `tests/Feature/Auth/LoginTest.php::throttles repeated login attempts` | test | 6 |
| AC-10 | HttpOnly cookie, redirect to /dashboard | `manual-test.md#step-2` | manual | 4, 5 |
| AC-11 | guest /dashboard → /login?next=/dashboard | `manual-test.md#step-4` | manual | 5 |
| MNC-1 | public endpoints tokenless, shapes unchanged | `tests/Feature/Auth/PublicEndpointsGuardTest.php::keeps job search, job detail and company profile public` | test | 2 |
| MNC-2 | /jobs renders for guests | `manual-test.md#step-5` | manual | 5 |

## Verification gates

- backend (api/): `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --no-progress`, `php artisan test`
- frontend (web/): `npm run lint`, `npx tsc --noEmit`, `npm test`, plus `npm run build` for task 5 (new routes)

## Done when
- [x] All tasks checked
- [x] Every Traceability row has a passing test or a manual step that was run
- [x] Gates green
