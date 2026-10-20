# Candidate profiles — Tasks

**Spec**: spec-HIRE-5-candidate-profiles | **Size**: M | **Tasks**: 4

## Phase 1: Backend (api/)

- [x] 1. Schema doc, migration, model and factory for candidate_profiles (laravel)
  - Covers: scaffolding for AC-1..AC-5
  - [x] 1.1 Write `docs/schemas/candidate-profiles.md` first (schema-first)
  - [x] 1.2 Migration `2026_10_23_090000_create_candidate_profiles_table` (uuid id, unique user_id FK cascade, json skills)
  - [x] 1.3 `App\Models\CandidateProfile` (HasUuids, casts) and `CandidateProfileFactory`
  - [x] 1.4 **Verify**: `php artisan migrate:fresh --seed` locally; gates green

- [x] 2. Show and upsert endpoints with policy and tests (laravel)
  - Covers: AC-1, AC-2, AC-3, AC-4, AC-5, MNC-1, MNC-2
  - [x] 2.1 Failing Pest tests: `tests/Feature/Profiles/ShowMyProfileTest.php`, `UpsertMyProfileTest.php` (one per AC)
  - [x] 2.2 DTOs `UpsertCandidateProfileDTO` (rules incl. `distinct:ignore_case`), `CandidateProfileDTO`
  - [x] 2.3 `CandidateProfileRepositoryInterface` + repository, bound in `RepositoryServiceProvider`
  - [x] 2.4 `CandidateProfileService`, `ProfileNotFoundException`, `CandidateProfilePolicy::manage`
  - [x] 2.5 Controllers + `routes/api/v1/profiles.php`; add both routes to `docs/api/api-contracts.md`
  - [x] 2.6 **Verify**: new tests green; `LoginTest` and `PublicEndpointsGuardTest` unchanged and green; gates green

## Phase 2: Frontend (web/)

- [x] 3. Types, fetchers and saveProfileAction (nextjs)
  - Covers: AC-6 (data layer)
  - [x] 3.1 `types/api/profiles.ts` mirrors the CandidateProfile shape exactly
  - [x] 3.2 `showMyProfile` / `upsertMyProfile` in `lib/api/endpoints.ts`; `lib/api/profiles.ts` (`getMyProfile` returns null on `profile_not_found`)
  - [x] 3.3 `app/(account)/profile/actions.ts` `saveProfileAction`: 422 `errors` (incl. `skills.N`) mapped to form fields; 401 → `/login?next=/profile`
  - [x] 3.4 **Verify**: web gates green

- [x] 4. /profile page and ProfileForm (nextjs)
  - Covers: AC-6
  - [x] 4.1 `app/(account)/profile/page.tsx` with `requireUser(['candidate'])`, `dynamic = 'force-dynamic'`
  - [x] 4.2 `components/profile-form.tsx` (`useActionState`, field errors, success banner)
  - [x] 4.3 Account nav "Profile" link for candidates already points here (HIRE-3), no change
  - [x] 4.4 **Manual check** (AC-6): as candidate@hireboard.test open `/profile` → empty form with the "need a profile" note → fill headline "Backend developer", skills "PHP, Laravel", years 4 → Save → "Profile saved" and the values stay → reload, values pre-filled → enter skills "PHP, php" → error under Skills, nothing saved. As employer@acme.test, `/profile` redirects away (requireUser)
  - [x] 4.5 **Verify**: web gates green, `npm run build` (new route)

## Traceability

| ID | Criterion (short) | Verified by | Kind | Task |
|----|-------------------|-------------|------|------|
| AC-1 | 404 profile_not_found before first save | `tests/Feature/Profiles/ShowMyProfileTest.php::returns 404 profile_not_found before the profile exists` | test | 2 |
| AC-2 | PUT upserts, GET returns it | `tests/Feature/Profiles/UpsertMyProfileTest.php::creates the profile on first save`, `::updates the existing profile`, `tests/Feature/Profiles/ShowMyProfileTest.php::returns the candidate profile` | test | 2 |
| AC-3 | 422 on headline / skills / years | `tests/Feature/Profiles/UpsertMyProfileTest.php::validates headline, skills and years of experience` | test | 2 |
| AC-4 | 403 for employers and admins | `tests/Feature/Profiles/UpsertMyProfileTest.php::forbids employers` | test | 2 |
| AC-5 | 401 for guests | `tests/Feature/Profiles/UpsertMyProfileTest.php::requires authentication` | test | 2 |
| AC-6 | /profile pre-fills, saves, shows errors | tasks.md step 4.4 (manual check) | manual | 3, 4 |
| MNC-1 | /auth/me unchanged | `tests/Feature/Auth/LoginTest.php::returns the current user` | test | 2 |
| MNC-2 | public endpoints unchanged | `tests/Feature/Auth/PublicEndpointsGuardTest.php::keeps job search, job detail and company profile public` | test | 2 |

## Verification gates

- backend (api/): `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --no-progress`, `php artisan test`
- frontend (web/): `npm run lint`, `npx tsc --noEmit`, `npm test`, plus `npm run build` for task 4 (new route)

## Done when
- [x] All tasks checked
- [x] Every Traceability row has a passing test or a manual step that was run
- [x] Gates green
