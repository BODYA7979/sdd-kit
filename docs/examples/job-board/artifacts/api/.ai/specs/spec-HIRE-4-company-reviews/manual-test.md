# Manual test — spec-HIRE-4-company-reviews

Verifies company reviews and moderation by hand. Every step lists the exact action and the exact
expected result. Steps 3 and 4 are the only proof for AC-11; the rest back up the Pest suite.

## Preconditions

1. Both repos on `feature/HIRE-4-company-reviews`.
2. Fresh local data (local only, this wipes the database):
   ```bash
   cd ~/work/hireboard/api && php artisan migrate:fresh --seed
   ```
3. API running: `php artisan serve --port=8000` in `api/`.
4. Web running: `npm run dev` in `web/`, with `API_BASE_URL=http://localhost:8000` in `web/.env.local`.
5. Demo accounts (password `password`): `candidate@hireboard.test`, `employer@acme.test`, `admin@hireboard.test`.
6. Use a private browser window so no earlier session cookie is present.

### Step 1

No public reviews yet.

```bash
curl -s http://localhost:8000/api/v1/companies/acme-robotics/reviews | jq '{data, meta}'
```
Expected: `"data": []`, `meta.total` is `0`, `meta.average_rating` is `null`.

### Step 2

Guests see a sign-in prompt.

Open http://localhost:3000/companies/acme-robotics/reviews.
Expected: heading "Reviews", the text "No published reviews yet." and a "Sign in as a candidate"
link to `/login?next=%2Fcompanies%2Facme-robotics%2Freviews`. No form.

### Step 3

A candidate submits a review (AC-11, AC-1).

1. Sign in at http://localhost:3000/login as `candidate@hireboard.test` / `password`.
2. Open http://localhost:3000/companies/acme-robotics/reviews.
3. Expected: the form "Review Acme Robotics" with Rating (1-5), Title and Your review.
4. Pick rating 4, title `Clear goals, kind team`, review
   `Interviews were well organised and the feedback arrived within a week.` and press "Submit review".
5. Expected: the form is replaced by "Thanks - your review is awaiting moderation."

### Step 4

The status card replaces the form (AC-11, AC-2).

Reload http://localhost:3000/companies/acme-robotics/reviews.
Expected: a "Your review" card with "Your review is awaiting moderation." and the title
`Clear goals, kind team`. No form. The public list is still empty.

### Step 5

Validation messages (AC-4).

Sign in as a new candidate: register at http://localhost:3000/register with role Candidate,
name `Riley Reviewer`, email `riley@hireboard.test`, password `password123`. Open
http://localhost:3000/companies/northwind-health/reviews, enter title `Meh` and review `Too short.`, submit.
Expected: "Please fix the highlighted fields." plus a message under Title and under Your review.
Nothing is stored.

### Step 6

An admin approves (AC-8, AC-7, AC-6).

1. Sign out (account menu, "Sign out"), sign in as `admin@hireboard.test`.
2. Open http://localhost:3000/admin/reviews.
3. Expected: "1 pending, oldest first." and the review by `Casey Candidate` for Acme Robotics.
4. Press "Approve". Expected: the queue shows "Nothing to moderate."
5. Open http://localhost:3000/companies/acme-robotics/reviews.
   Expected: the review is listed with "Verified candidate", the average shows `4.0` from 1 review,
   and the name "Casey Candidate" appears nowhere on the page.

### Step 7

An admin rejects; the candidate sees the reason (AC-9, AC-10).

1. As `riley@hireboard.test`, submit a valid review for Northwind Health
   (rating 2, title `Slow hiring process`, review `Three weeks between interviews and no feedback at all.`).
2. As `admin@hireboard.test` on http://localhost:3000/admin/reviews, type the reason
   `Please remove the recruiter's name.` and press "Reject".
   Expected: the review leaves the queue.
3. As `riley@hireboard.test`, open http://localhost:3000/companies/northwind-health/reviews.
   Expected: "Your review was not published." and "Reason: Please remove the recruiter's name.".
   The public list is empty.
4. Try to decide it again:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login -H 'Accept: application/json' \
     -H 'Content-Type: application/json' -d '{"email":"admin@hireboard.test","password":"password"}' | jq -r .data.token)
   ID=$(sqlite3 database/database.sqlite "select id from company_reviews where status='rejected' limit 1")
   curl -s -X POST "http://localhost:8000/api/v1/admin/reviews/$ID/approve" \
     -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' | jq '{status, code}'
   ```
   Run from `api/`. Expected: `{"status": 409, "code": "review_already_moderated"}`.

### Step 8

Company show payload unchanged (MNC-1).

```bash
curl -s http://localhost:8000/api/v1/companies/acme-robotics | jq '.data | keys'
```
Expected exactly: `["description", "id", "location", "name", "open_jobs_count", "slug", "website"]`.

### Step 9

Job search unchanged (MNC-2).

Open http://localhost:3000/jobs as a guest and filter by Remote.
Expected: the same open postings, order and filters as before this branch; no review data on job cards.

### Step 10

Employers and admins get no form (AC-3).

Sign in as `employer@acme.test` and open http://localhost:3000/companies/acme-robotics/reviews.
Expected: the public list only. No form, no status card.

## Rollback

The change adds one table and no data migration. To back it out locally:
`php artisan migrate:rollback --step=1` in `api/` drops `company_reviews`; then revert the two branches.
