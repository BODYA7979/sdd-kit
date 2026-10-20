---
id: spec-HIRE-7-company-careers-page
title: Company careers page
type: feature
size: S
priority: P2
status: done
ticket: HIRE-7
stakeholders: [Maya Chen]
approved_by: Maya Chen
approved_at: 2026-10-28T10:15:00Z
created: 2026-10-28
stacks: [nextjs]
---

# Company careers page

## Summary
Visitors get a public careers page per company at `/companies/<slug>`. It shows the company
profile, its open jobs and its rating, and job detail links the company name to it. Candidates
can size up an employer in one place before applying. Everything the page needs is already served
by the API, so this is a web-only change.

## Context
- **Problem**: job detail shows the company name, but there is nowhere to see the company itself
  or its other openings. Company reviews (HIRE-4) live on `/companies/<slug>/reviews`, which
  nothing links to from the browse journey.
- **User impact**: visitors and candidates compare employers without leaving Hireboard.

## Scope
### In scope
- New page `app/companies/[slug]/page.tsx`, with no `loading.tsx` for the segment (see AC-2).
- Rating summary (average + approved review count) with a link to `/companies/<slug>/reviews`.
- Company name on job detail links to the careers page.
### Out of scope
- Any change in `api/` (new endpoints, new fields, eager-loaded counts).
- Editing company details (employer self-service is a later ticket).
- Pagination of the company's jobs beyond the first page; a "See all" link to
  `/jobs?company=<slug>` covers larger companies.

## Must NOT change
- **MNC-1**: No change in `api/`. `git -C api diff --stat main` is empty after the build.
- **MNC-2**: The `/jobs` page (filters, results, ordering, empty state) is unchanged.

## Acceptance criteria
- **AC-1**: WHEN anyone opens `/companies/<slug>` for an existing company THE SYSTEM SHALL show
  its name, location, website and description, and list its open jobs from
  `GET /api/v1/jobs?company=<slug>`.
- **AC-2**: IF the slug does not match a company THEN THE SYSTEM SHALL render the app's not-found page
  with `noindex` meta and an HTTP 404 status. The page awaits `getCompany()` and calls
  `notFound()` before anything streams, so the route has no `loading.tsx`.
- **AC-3**: WHEN the careers page renders THE SYSTEM SHALL show the average rating and the number
  of approved reviews from the `listCompanyReviews` meta, or "No reviews yet" when there are none,
  with a link to `/companies/<slug>/reviews`. Job detail SHALL link the company name to
  `/companies/<slug>`.

## Boundaries
- **Always**: Server Components; all calls through `lib/api/*` fetchers and `lib/api/client.ts`;
  `cache: 'no-store'`; Tailwind utility classes; reuse `JobCard`.
- **Ask first**: any change in `api/`; a new dependency; a new endpoint in `lib/api/endpoints.ts`.
- **Never**: call the API from the browser; change the `/jobs` page or `JobFilters`; weaken an
  existing test.

## Technical context
- **Related code**: `lib/api/jobs.ts` (`getCompany`, `searchJobs`), `lib/api/reviews.ts`
  (`listCompanyReviews`), `components/job-card.tsx`, `app/jobs/[id]/page.tsx`.
- **Already implemented**:
  - `GET /api/v1/companies/{slug}` returns `Company` with `open_jobs_count` (HIRE-1).
  - `GET /api/v1/jobs?company=<slug>` filters open postings by company (HIRE-1).
  - `GET /api/v1/companies/{slug}/reviews` returns `meta.average_rating` and `meta.total` (HIRE-4).
  - `showCompany`, `searchJobs` and `listCompanyReviews` are already in `lib/api/endpoints.ts`.
- **Approach**: one Server Component that loads the three calls in parallel with `Promise.all`,
  calls `notFound()` when `getCompany` returns null, and treats a 404 from the reviews call as
  "no summary" so an unknown slug still reaches `notFound()`.
- **Repos**: `web/` changes; `../api` is read-only context.

## Open questions
- [x] Q1: What does the rating summary show for a company with no approved reviews? —
  **Answered** (Maya Chen): the text "No reviews yet", still linking to the reviews page so the
  first candidate can write one.

## Dependencies
- **Requires**: spec-HIRE-4-company-reviews (reviews list meta), HIRE-1 job search filters.
- **Blocks**: none.

---
Next: `/sdd web/.ai/specs/spec-HIRE-7-company-careers-page` (approval → build)
