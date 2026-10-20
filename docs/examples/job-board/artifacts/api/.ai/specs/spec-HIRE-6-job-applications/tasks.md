# Job applications — Tasks

**Spec**: spec-HIRE-6-job-applications | **Size**: M | **Tasks**: 5

Paths starting with `web/` are in the sibling repo `../web`. All other paths are in `api/`.

## Phase 1: Backend

- [x] 1. Schema doc, migration, model and factory for job_applications (laravel)
  - Covers: scaffolding for AC-1..AC-7
  - Files: `docs/schemas/job-applications.md`, `database/migrations/2026_10_24_090000_create_job_applications_table.php`, `app/Models/JobApplication.php`, `database/factories/JobApplicationFactory.php`
  - [x] 1.1 Write `docs/schemas/job-applications.md` first: columns, the unique `(job_posting_id, candidate_id)` index, relations, personal data note
  - [x] 1.2 Migration, `JobApplication` model (`HasUuids`, `jobPosting`, `candidate`, `candidateProfile`), factory
  - [x] 1.3 **Verify**: `php artisan migrate:fresh --seed` runs; gates green

- [x] 2. Submit endpoint with the application rules (laravel)
  - Covers: AC-1, AC-2, AC-3, AC-4, AC-5, MNC-1
  - Files: `app/DTOs/SubmitApplicationDTO.php`, `app/DTOs/JobApplicationDTO.php`, `app/Contracts/JobApplicationRepositoryInterface.php`, `app/Repositories/JobApplicationRepository.php`, `app/Services/JobApplicationService.php`, `app/Policies/JobApplicationPolicy.php`, `app/Exceptions/ProfileRequiredException.php`, `app/Exceptions/JobNotOpenException.php`, `app/Exceptions/AlreadyAppliedException.php`, `app/Http/Controllers/Applications/SubmitApplicationController.php`, `routes/api/v1/applications.php`, `app/Providers/RepositoryServiceProvider.php`, `docs/api/api-contracts.md`, `tests/Feature/Applications/SubmitApplicationTest.php`
  - [x] 2.1 Failing Pest tests for AC-1..AC-5 in `SubmitApplicationTest.php`
  - [x] 2.2 Service checks in order: found (404 `job_not_found`), open (`job_not_open`), profile (`profile_required`), duplicate (`already_applied`)
  - [x] 2.3 Bind the repository in `RepositoryServiceProvider::$bindings`; add the endpoint to `docs/api/api-contracts.md`
  - [x] 2.4 **Verify**: Applications tests green; `ShowJobPostingTest` unchanged and green (MNC-1); gates green

- [x] 3. Candidate and employer list endpoints (laravel)
  - Covers: AC-5, AC-6, AC-7
  - Files: `app/Http/Controllers/Applications/ListMyApplicationsController.php`, `app/Http/Controllers/Applications/ListEmployerApplicationsController.php`, `app/Policies/JobApplicationPolicy.php`, `app/Repositories/JobApplicationRepository.php`, `routes/api/v1/applications.php`, `docs/api/api-contracts.md`, `tests/Feature/Applications/ListMyApplicationsTest.php`, `tests/Feature/Applications/ListEmployerApplicationsTest.php`
  - [x] 3.1 Failing tests: own applications only, newest first; employer sees own company only, closed postings included, `candidate` = name, email, headline
  - [x] 3.2 Employer query scoped by `companies.owner_id` in SQL; `toEmployerArray()` for the employer view
  - [x] 3.3 **Verify**: tests green; gates green

## Phase 2: Frontend

- [x] 4. Apply page, ApplyForm and submit action (nextjs)
  - Covers: AC-8, MNC-2
  - Files: `web/types/api/applications.ts`, `web/lib/api/applications.ts`, `web/lib/api/endpoints.ts`, `web/app/jobs/[id]/apply/page.tsx`, `web/app/jobs/[id]/apply/actions.ts`, `web/components/apply-form.tsx`
  - [x] 4.1 Types mirror `toApiArray()` / `toEmployerArray()`; register `submitApplication`, `listMyApplications`, `listEmployerApplications` in `endpoints.ts`
  - [x] 4.2 `submitApplicationAction` maps `profile_required`, `job_not_open`, `already_applied`, `job_not_found` and field errors; redirects to `/applications?applied=1`
  - [x] 4.3 **Verify**: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` green; guest still sees `/jobs/[id]`

- [x] 5. Candidate and employer application pages (nextjs)
  - Covers: AC-6, AC-7, AC-8
  - Files: `web/app/(account)/applications/page.tsx`, `web/app/(account)/employer/applications/page.tsx`
  - [x] 5.1 `/applications` lists own applications with the success banner; `/employer/applications` lists applicants with mailto links
  - [x] 5.2 **Verify**: web gates green including `npm run build`

Converge round 1 found no gaps, so no gap phase was appended.

## Traceability

| ID | Criterion (short) | Verified by | Kind | Task |
|----|-------------------|-------------|------|------|
| AC-1 | candidate with profile applies to an open job, 201 | `tests/Feature/Applications/SubmitApplicationTest.php::submits an application to an open job` | test | 2 |
| AC-2 | no profile, 422 `profile_required` | `tests/Feature/Applications/SubmitApplicationTest.php::requires a candidate profile` | test | 2 |
| AC-3 | draft or closed job, 422 `job_not_open` | `tests/Feature/Applications/SubmitApplicationTest.php::refuses closed jobs` | test | 2 |
| AC-4 | duplicate, 409 `already_applied`, also under a race | `tests/Feature/Applications/SubmitApplicationTest.php::refuses a duplicate application` and `::maps a concurrent duplicate insert to already_applied` (the race test was added after /deep-review finding F1, 2026-10-24; see `.ai/reviews/REVIEW-spec-HIRE-6-job-applications-20261024-161502.md`) | test | 2 |
| AC-5 | non-candidate 403; unknown job 404 `job_not_found` | `tests/Feature/Applications/SubmitApplicationTest.php::forbids employers from applying` | test | 2, 3 |
| AC-6 | own applications, newest first | `tests/Feature/Applications/ListMyApplicationsTest.php::lists the candidate applications newest first` | test | 3, 5 |
| AC-7 | employer sees own company only, closed included, name/email/headline, per_page capped at 50 | `tests/Feature/Applications/ListEmployerApplicationsTest.php::lists applications for the employer company only` (now with a `?per_page=500` assertion, added after /deep-review finding F2, 2026-10-24) and `::includes applications to closed jobs` | test | 3, 5 |
| AC-8 | web apply flow: redirect + banner; `profile_required` banner links to /profile | `manual-test.md#step-2`, `manual-test.md#step-3` | manual | 4, 5 |
| MNC-1 | job show payload unchanged | `tests/Feature/Jobs/ShowJobPostingTest.php::shows an open posting with its company` (unchanged) | test | 2 |
| MNC-2 | guests still see job detail | `manual-test.md#step-1` | manual | 4 |

## Verification gates

- backend (laravel, run in `api/`): `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --no-progress`, `php artisan test`
- frontend (nextjs, run in `web/`): `npm run lint`, `npx tsc --noEmit`, `npm test`, plus `npm run build` because this spec adds routes

## Done when
- [x] All tasks checked
- [x] Every Traceability row has a passing test or a manual step that was run
- [x] Gates green
