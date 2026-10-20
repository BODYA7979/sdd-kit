# Company careers page — Tasks

**Spec**: spec-HIRE-7-company-careers-page | **Size**: S | **Tasks**: 2

## Phase 1: Frontend

- [x] 1. Careers page (nextjs)
  - Covers: AC-1, AC-2
  - [x] 1.1 `app/companies/[slug]/page.tsx`: load `getCompany(slug)` and
    `searchJobs({ company: slug })` in parallel; `notFound()` when the company is null
  - [x] 1.2 Profile header (name, location, website, description) and the open jobs list with
    `JobCard`; "See all N jobs" link to `/jobs?company=<slug>` when there are more than one page
  - [x] 1.3 No `loading.tsx` in `app/companies/[slug]/`: a loading boundary streams a 200
    response before `notFound()` runs, which would break AC-2
  - [x] 1.4 **Verify**: `/companies/acme-robotics` renders; `/companies/no-such-company` shows the
    not-found page with status 404; gates green

- [x] 2. Rating summary and job-detail company link (nextjs)
  - Covers: AC-3, MNC-2
  - [x] 2.1 Add `listCompanyReviews(slug, 1)` to the parallel load; a 404 from it yields no
    summary instead of an error
  - [x] 2.2 Show `average_rating` to one decimal and the approved review count, or
    "No reviews yet"; link to `/companies/<slug>/reviews`
  - [x] 2.3 Link the company name in `app/jobs/[id]/page.tsx` to `/companies/<slug>`
  - [x] 2.4 **Verify**: summary matches `curl -s localhost:8000/api/v1/companies/acme-robotics/reviews | jq .meta`;
    `/jobs` unchanged; gates green; `npm run build` passes (new route)

## Traceability

| ID | Criterion (short) | Verified by | Kind | Task |
|----|-------------------|-------------|------|------|
| AC-1 | careers page shows profile + open jobs | `manual-test.md#step-1`, `npx tsc --noEmit` | manual | 1 |
| AC-2 | unknown slug renders not-found (404) | `manual-test.md#step-2` | manual | 1 |
| AC-3 | rating summary, "No reviews yet", reviews link, job-detail link | `manual-test.md#step-3`, `manual-test.md#step-4`, `manual-test.md#step-5` | manual | 2 |
| MNC-1 | no change in `api/` | `manual-test.md#step-6` (`git -C api diff --stat main` empty) | manual | — |
| MNC-2 | `/jobs` page unchanged | `lib/search-params.test.ts` (unchanged, green), `manual-test.md#step-7` | test + manual | 2 |

## Verification gates

Run after every task in `web/`:
- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `npm run build` (this spec adds a route)

## Done when
- [x] All tasks checked
- [x] Every Traceability row has a passing test or a manual step that was run
- [x] Gates green
