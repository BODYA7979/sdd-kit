# Public browse journey: how it works

The anonymous part of Hireboard: job search with filters, job detail and the company careers page. Nothing here needs a session. This page follows a request from the page down to the database, lists the rules each layer enforces, and shows where to make the common changes.

Tickets that shaped this code: HIRE-1 (first slice), HIRE-7 (careers page), HIRE-8 (salary on job cards), HIRE-9 (closed postings by direct link). Test plan: [qa-plan-2026-11-03.md](../qa/qa-plan-2026-11-03.md).

## Routes

| Page | File | Data |
|------|------|------|
| `/` | [app/page.tsx](../../app/page.tsx) | `redirect('/jobs')` |
| `/jobs` | [app/jobs/page.tsx](../../app/jobs/page.tsx) with `loading.tsx` and `error.tsx` | `searchJobs(filters)` |
| `/jobs/[id]` | [app/jobs/[id]/page.tsx](../../app/jobs/[id]/page.tsx) | `getJob(id)`, `notFound()` on `null` |
| `/companies/[slug]` | [app/companies/[slug]/page.tsx](../../app/companies/[slug]/page.tsx) (no `loading.tsx`, so unknown slugs return 404) | `getCompany(slug)`, `searchJobs({ company: slug })`, `listCompanyReviews(slug, 1)` |

| API endpoint | Controller | Registry key |
|--------------|------------|--------------|
| `GET /api/v1/jobs` | `Jobs\SearchJobPostingsController` | `searchJobs` |
| `GET /api/v1/jobs/{id}` | `Jobs\ShowJobPostingController` | `showJob` |
| `GET /api/v1/companies/{slug}` | `Companies\ShowCompanyController` | `showCompany` |

The full request and response shapes are in [api-contracts.md](../../../api/docs/api/api-contracts.md).

## Data flow: job search

```
app/jobs/page.tsx                    (Server Component, awaits searchParams)
  └─ parseJobFilters(searchParams)   lib/search-params.ts
  └─ searchJobs(filters)             lib/api/jobs.ts
       └─ apiFetch(endpoints.searchJobs, { query })     lib/api/client.ts  (server-only)
            └─ GET {API_BASE_URL}/api/v1/jobs?q=…&remote=1
                 └─ SearchJobPostingsController          JobSearchDTO from the query string
                      └─ JobPostingService::search
                           └─ JobPostingRepositoryInterface::searchOpen
                                └─ JobPostingRepository   status = open, newest published_at first
                      └─ JsonResponseTrait::paginated     data[] via JobPostingDTO::toApiArray(), meta
  └─ <JobFilters> + <JobCard> per posting
```

### Web side

- **The URL is the state.** [components/job-filters.tsx](../../components/job-filters.tsx) is a plain `GET` form, so submitting it changes the query string and the Server Component renders again. No client state holds filters.
- [lib/search-params.ts](../../lib/search-params.ts) owns the mapping. `parseJobFilters()` turns Next.js `searchParams` into a typed `JobFilters` object and drops empty and unknown values (an `employment_type` outside the `EmploymentType` union is ignored, not forwarded). `toQueryString()` is the inverse. Both are covered by [search-params.test.ts](../../lib/search-params.test.ts).
- [lib/api/client.ts](../../lib/api/client.ts) starts with `import 'server-only'`. It resolves the path from [lib/api/endpoints.ts](../../lib/api/endpoints.ts), fills `{id}` and `{slug}` from `params`, and sends every request with `cache: 'no-store'`. Non-2xx responses throw `ApiError` with `status`, `code` and `errors` from the API error envelope.
- `API_BASE_URL` comes from `.env.local` and is never prefixed `NEXT_PUBLIC_`. The browser never calls the API directly (ADR-0001), so there is no CORS configuration to maintain.
- All pages here render per request. Nothing is fetched at build time, so `npm run build` succeeds without a running API.

### API side

- `JobSearchDTO` carries `q`, `location`, `remote`, `employmentType`, `company`, `page` and `perPage`. The controller normalizes `remote` with `$request->boolean()`, so `remote=1`, `remote=true` and `remote=on` all mean true.
- `per_page` defaults to 20 and is capped at 50 (BR-11).
- `JobPostingRepository::searchOpen` always applies `status = open` (BR-10) before any filter, then orders by `published_at` descending (BR-11). The `(status, published_at)` index on `job_postings` backs this query. The `company` filter matches the company slug.
- The repository returns a paginator of `JobPostingDTO`, never Eloquent models. `JsonResponseTrait::paginated` maps each item through `toApiArray()` and adds `meta: {current_page, per_page, total, last_page}` (INV-01).

## Data flow: job detail

```
app/jobs/[id]/page.tsx              (awaits params)
  └─ getJob(id)                     lib/api/jobs.ts: returns null when ApiError.status === 404
       └─ GET /api/v1/jobs/{id}
            └─ ShowJobPostingController
                 └─ JobPostingService::findOpen
                      └─ JobPostingRepositoryInterface::findOpenById   null unless status = open
                      └─ throws JobPostingNotFoundException            404, code job_not_found
  └─ notFound() when null           app/not-found.tsx
```

Unknown, closed and draft ids all produce the same 404 `job_not_found`, so a closed posting is indistinguishable from one that never existed (BR-10).

**Two lookups, on purpose.** `JobPostingRepositoryInterface` has both `findOpenById` and `findById`:

| Method | Filter | Used by | Why |
|--------|--------|---------|-----|
| `findOpenById` | `status = open` | `JobPostingService::findOpen` (public detail) | Draft and closed postings are never public. |
| `findById` | none | `JobApplicationService::submit` | Applying to a closed job must answer 422 `job_not_open`, not 404, and employers still see applications to closed jobs. |

HIRE-9 was `findOpen` calling `findById`. Any new public read path must use `findOpenById` or `searchOpen`. `ClosedJobPostingVisibilityTest` fails if the public detail regresses.

## Data flow: careers page

`app/companies/[slug]/page.tsx` makes three calls in parallel with `Promise.all`:

1. `getCompany(slug)`: `GET /api/v1/companies/{slug}` through `ShowCompanyController` and `CompanyService::findBySlug`. `null` on 404 `company_not_found`, which renders the not-found page. The response includes `open_jobs_count`.
2. `searchJobs({ company: slug })`: the same search endpoint as `/jobs`, so the careers page lists exactly what search would list for that company, closed and draft postings excluded.
3. `listCompanyReviews(slug, 1)` from `lib/api/reviews.ts`: the rating summary uses `meta.average_rating` (approved reviews only, rounded half-up to one decimal, `null` when there are none, BR-43) and `meta.total`. A 404 from this call is swallowed so an unknown slug reaches `notFound()` through `getCompany` instead of the error boundary.

The company payload carries no review fields on purpose. HIRE-4 kept `GET /api/v1/companies/{slug}` unchanged (its MNC-1), which is why the rating comes from the reviews list.

## Salary display

[components/job-card.tsx](../../components/job-card.tsx) formats `salary` with `Intl.NumberFormat` using the posting's `currency`, producing for example `€60,000 – €80,000 a year`. When `salary` is `null`, the card renders no salary line. The API stores salaries as whole-unit annual integers plus an ISO-4217 currency (BR-12, INV-07), so the frontend never does arithmetic on them, only formatting.

## Changing the journey

### Add a search filter

1. API: add the property to `JobSearchDTO`, apply it in `JobPostingRepository::searchOpen` after the `status = open` constraint, and add a case to `SearchJobPostingsTest`.
2. Document the query parameter in [api-contracts.md](../../../api/docs/api/api-contracts.md).
3. Web: add the field to `JobFilters` in [types/api/jobs.ts](../../types/api/jobs.ts), parse and serialize it in [lib/search-params.ts](../../lib/search-params.ts) with a test in `search-params.test.ts`, and add the input to `components/job-filters.tsx`.
4. Run the gates in both repos: `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --no-progress` and `php artisan test` in `api/`, and `npm run lint`, `npx tsc --noEmit` and `npm test` in `web/`.

### Add a field to the job payload

Add it to `JobPostingDTO` and its `toApiArray()`, then to the `JobPosting` type in `types/api/jobs.ts`. The type mirrors the API by hand and the response is cast to it, not validated, so `npx tsc --noEmit` only catches fields that are renamed, removed or narrowed. A newly added field produces no type error anywhere: update the components that should display it (`components/job-card.tsx`, `app/jobs/[id]/page.tsx`) yourself. `ShowJobPostingTest` and the HIRE-9 guard `still shows open postings with the same shape` assert the payload shape, so update them in the same change.

### Add a public page that calls a new endpoint

Register the endpoint in [lib/api/endpoints.ts](../../lib/api/endpoints.ts) and in `api-contracts.md` (INV-06). A path that exists in only one of them is a contract bug.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `/jobs` shows the error boundary | The API is not running on `API_BASE_URL`, or `.env.local` is missing. Start `php artisan serve --port=8000`. |
| A posting you just closed still shows in a browser tab | The tab was rendered before the change. Reload; nothing is cached server-side. |
| Search returns nothing on a fresh checkout | The database has no data. Run `php artisan migrate:fresh --seed` in `api/` (local only). |
