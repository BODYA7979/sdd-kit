# Company reviews with moderation — Tasks

**Spec**: spec-HIRE-4-company-reviews | **Size**: M | **Tasks**: 7

## Phase 1: Backend (api/)

- [x] 1. Schema doc, migration, enum, model and factory (laravel)
  - Covers: scaffolding for AC-1..AC-10
  - [x] 1.1 `docs/schemas/company-reviews.md` first (schema-first), then
    `database/migrations/2026_10_22_090000_create_company_reviews_table.php` with
    UNIQUE (company_id, candidate_id) and INDEX (company_id, status)
  - [x] 1.2 `App\Enums\ReviewStatus`, `App\Models\CompanyReview` (HasUuids, status cast),
    `Company::reviews()`, `CompanyReviewFactory` with pending()/approved()/rejected()
  - [x] 1.3 **Verify**: `php artisan migrate:fresh --seed` runs; gates green

- [x] 2. Submit and "mine" endpoints (laravel)
  - Covers: AC-1, AC-2, AC-3, AC-4, AC-5, AC-9 (mine)
  - [x] 2.1 Failing tests in `tests/Feature/Reviews/SubmitCompanyReviewTest.php`
  - [x] 2.2 `SubmitCompanyReviewDTO` (rules), `CompanyReviewRepositoryInterface` + repository,
    `CompanyReviewService::submit()` / `findMine()`, `CompanyReviewPolicy::create()`,
    `ReviewAlreadyExistsException`, `ReviewNotFoundException`, binding in `RepositoryServiceProvider`
  - [x] 2.3 `SubmitCompanyReviewController`, `ShowMyCompanyReviewController`, `routes/api/v1/reviews.php`
  - [x] 2.4 **Verify**: SubmitCompanyReviewTest green; gates green

- [x] 3. Public list and average rating (laravel)
  - Covers: AC-6, AC-7, MNC-1
  - [x] 3.1 Failing tests in `tests/Feature/Reviews/ListCompanyReviewsTest.php`, including the
    company show guard
  - [x] 3.2 `CompanyReviewService::listApproved()` / `averageRating()` (half-up on integer
    totals), `ListCompanyReviewsController` with `meta.average_rating`
  - [x] 3.3 **Verify**: ListCompanyReviewsTest green; `tests/Feature/Companies/ShowCompanyTest.php`
    untouched and green; gates green

- [x] 4. Moderation endpoints and policy (laravel)
  - Covers: AC-8, AC-9, AC-10
  - [x] 4.1 Failing tests in `tests/Feature/Reviews/ModerateReviewTest.php`
  - [x] 4.2 `RejectReviewDTO`, `CompanyReviewPolicy::moderate()`, `listPending()` / `approve()` /
    `reject()` with a conditional update on `status = pending`, `ReviewAlreadyModeratedException`
  - [x] 4.3 `ListPendingReviewsController`, `ApproveReviewController`, `RejectReviewController`;
    document all six endpoints and the three error codes in `docs/api/api-contracts.md`
  - [x] 4.4 **Verify**: ModerateReviewTest green; full suite green; gates green

## Phase 2: Frontend (web/)

- [x] 5. Types, fetchers and the public reviews list (nextjs)
  - Covers: AC-6, AC-7
  - [x] 5.1 `types/api/reviews.ts` mirroring the three API shapes; six entries in
    `lib/api/endpoints.ts`; `lib/api/reviews.ts`
  - [x] 5.2 `app/companies/[slug]/reviews/page.tsx` list with `StarRating`, average and
    pagination; `notFound()` for an unknown slug
  - [x] 5.3 **Verify**: page renders for `acme-robotics`; gates green; `npm run build` passes

- [x] 6. ReviewForm and submitReviewAction with error mapping (nextjs)
  - Covers: AC-1, AC-2, AC-3, AC-4, AC-11
  - [x] 6.1 `components/review-form.tsx` (`useActionState`), `app/companies/[slug]/reviews/actions.ts`
    mapping `validation_failed` to field errors and `review_already_exists` / `forbidden` to messages
  - [x] 6.2 Status card instead of the form when `getMyCompanyReview()` returns a review;
    sign-in link for guests; nothing for employers and admins
  - [x] 6.3 **Verify**: gates green; `npm run build` passes; `/companies/acme-robotics/reviews` renders (server-rendered, no console errors). AC-11 is confirmed by a human in manual-test.md steps 3 and 4

- [x] 7. Admin moderation page (nextjs)
  - Covers: AC-8, AC-9
  - [x] 7.1 `app/(account)/admin/reviews/page.tsx` guarded by `requireUser(['admin'])`
  - [x] 7.2 `app/(account)/admin/reviews/actions.ts`: `approveReviewAction`, `rejectReviewAction`,
    `revalidatePath('/admin/reviews')`, error codes shown as a banner
  - [x] 7.3 **Verify**: gates green; `npm run build` passes; `/admin/reviews` is registered as a dynamic route and redirects a guest to `/login`. AC-8 and AC-9 in the browser are confirmed by a human in manual-test.md steps 6 and 7

## Traceability

| ID | Criterion (short) | Verified by | Kind | Task |
|----|-------------------|-------------|------|------|
| AC-1 | candidate review stored as pending, 201 | `tests/Feature/Reviews/SubmitCompanyReviewTest.php::stores a pending review for a candidate` | test | 2, 6 |
| AC-2 | second review in any status → 409 review_already_exists | `tests/Feature/Reviews/SubmitCompanyReviewTest.php::rejects a second review from the same candidate` | test | 2, 6 |
| AC-3 | employer or admin submit → 403 | `tests/Feature/Reviews/SubmitCompanyReviewTest.php::forbids employers and admins from reviewing` | test | 2, 6 |
| AC-4 | invalid rating/title/body → 422 field errors | `tests/Feature/Reviews/SubmitCompanyReviewTest.php::validates rating, title and body` | test | 2, 6 |
| AC-5 | guest submit → 401 | `tests/Feature/Reviews/SubmitCompanyReviewTest.php::requires authentication` | test | 2 |
| AC-6 | approved only, newest first, anonymous author | `tests/Feature/Reviews/ListCompanyReviewsTest.php::lists only approved reviews newest first without author identity` | test | 3, 5 |
| AC-7 | average of approved, half-up 1 decimal, null when none | `tests/Feature/Reviews/ListCompanyReviewsTest.php::reports the average of approved ratings only` | test | 3, 5 |
| AC-8 | approve sets status, moderator, time; review becomes public | `tests/Feature/Reviews/ModerateReviewTest.php::approves a pending review`, `manual-test.md#step-6` (human, after TestPlan) | test + manual | 4, 7 |
| AC-9 | reject stores reason; never public; candidate sees it via mine | `tests/Feature/Reviews/ModerateReviewTest.php::rejects a pending review with a reason`, `tests/Feature/Reviews/SubmitCompanyReviewTest.php::shows the candidate their own review status`, `manual-test.md#step-7` (human, after TestPlan) | test + manual | 2, 4, 7 |
| AC-10 | not pending → 409; non-admin → 403 | `tests/Feature/Reviews/ModerateReviewTest.php::refuses to moderate a review twice`, `tests/Feature/Reviews/ModerateReviewTest.php::forbids non-admins from moderating` | test | 4 |
| AC-11 | form for candidates without a review, confirmation, status card | `manual-test.md#step-3`, `manual-test.md#step-4` (run by a human after TestPlan) | manual | 6 |
| MNC-1 | company show payload unchanged | `tests/Feature/Reviews/ListCompanyReviewsTest.php::leaves the company profile response unchanged`, `manual-test.md#step-8` | test + manual | 3 |
| MNC-2 | job search API and /jobs unchanged | `tests/Feature/Jobs/SearchJobPostingsTest.php` (unchanged, green), `manual-test.md#step-9` | test + manual | — |
| MNC-3 | /auth/me shape and roles unchanged | `tests/Feature/Auth/LoginTest.php::returns the current user` (unchanged, green) | test | — |

## Verification gates

Run after every task in the repo the task touches.
- backend (`api/`, laravel): `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --no-progress`, `php artisan test`
- frontend (`web/`, nextjs): `npm run lint`, `npx tsc --noEmit`, `npm test`, plus `npm run build` (this spec adds routes)

## Done when
- [x] All tasks checked
- [x] Every Traceability row has a passing test or a manual step that a human ran after TestPlan
- [x] Gates green
