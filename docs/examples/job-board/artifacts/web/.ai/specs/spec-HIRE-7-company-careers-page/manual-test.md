# Company careers page — manual test

**Spec**: spec-HIRE-7-company-careers-page | **Ticket**: HIRE-7

## Preconditions

1. API running with fresh demo data:

   ```bash
   cd ~/work/hireboard/api
   php artisan migrate:fresh --seed
   php artisan serve --port=8000
   ```

2. Web running in a second terminal, with `API_BASE_URL=http://localhost:8000` in `web/.env.local`:

   ```bash
   cd ~/work/hireboard/web
   npm run dev
   ```

3. Use a private browser window (signed out) unless a step says otherwise.

Fresh seed data has no reviews. Steps 3 and 4 create and approve one.

### Step 1

Careers page shows the company profile and its open jobs (AC-1).

1. Note the expected numbers:

   ```bash
   curl -s localhost:8000/api/v1/companies/acme-robotics | jq '.data | {name, location, website, open_jobs_count}'
   curl -s 'localhost:8000/api/v1/jobs?company=acme-robotics' | jq '[.data[].title]'
   ```

2. Open http://localhost:3000/companies/acme-robotics.

**Expected**: the heading reads "Acme Robotics", the location "Berlin" and the website link are
shown, followed by the description. The "Open jobs" heading shows the same count as
`open_jobs_count`, and the list shows the same titles as the second `curl`, newest first. "Legacy
PHP Maintainer" (closed) is not listed.

### Step 2

Unknown slug renders the not-found page (AC-2).

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/companies/no-such-company
```

Then open http://localhost:3000/companies/no-such-company in the browser.

**Expected**: `404` from `curl`; the browser shows the app's not-found page, not an error page.

### Step 3

Rating summary with no reviews (AC-3, clarity gate Q1).

Open http://localhost:3000/companies/northwind-health.

**Expected**: the rating area reads "No reviews yet" and "Read and write reviews" links to
http://localhost:3000/companies/northwind-health/reviews.

### Step 4

Rating summary with an approved review (AC-3).

1. Sign in at http://localhost:3000/login as `candidate@hireboard.test` / `password`.
2. Open http://localhost:3000/companies/acme-robotics/reviews and submit rating 4, title
   "Clear hiring process", body "Two short interviews and a fast, friendly decision.".
3. Sign out, sign in as `admin@hireboard.test` / `password`, open
   http://localhost:3000/admin/reviews and approve the review.
4. Open http://localhost:3000/companies/acme-robotics.

**Expected**: the rating area reads "4.0" with "out of 5 · 1 review", and the link goes to
`/companies/acme-robotics/reviews`. Cross-check:

```bash
curl -s localhost:8000/api/v1/companies/acme-robotics/reviews | jq '.meta | {average_rating, total}'
```

shows `average_rating` 4 and `total` 1.

### Step 5

Job detail links to the careers page (AC-3).

1. Open http://localhost:3000/jobs and click any Acme Robotics posting.
2. Click the company name "Acme Robotics" under the job title.

**Expected**: the browser lands on http://localhost:3000/companies/acme-robotics.

### Step 6

No change in the API repo (MNC-1).

```bash
cd ~/work/hireboard
git -C api status --short
git -C api diff --stat main
```

**Expected**: both commands print nothing.

### Step 7

The `/jobs` page is unchanged (MNC-2).

1. Open http://localhost:3000/jobs?q=engineer&remote=1.
2. Clear the filters and open http://localhost:3000/jobs.

**Expected**: filters, result cards and ordering look and behave as before the change; the URL
query string still drives the filters. In `web/`, `npm test` passes with
`lib/search-params.test.ts` unchanged.

## Rollback

Web-only change with no data migration: revert the merge commit in `web/` and redeploy.
