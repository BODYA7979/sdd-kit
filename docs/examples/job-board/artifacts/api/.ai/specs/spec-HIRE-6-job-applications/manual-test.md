# Manual test plan: job applications (HIRE-6)

Spec: `spec-HIRE-6-job-applications`. Run against a freshly seeded local database. Steps 1-5
take about ten minutes.

## Preconditions

```bash
# terminal 1
cd ~/work/hireboard/api && php artisan migrate:fresh --seed && php artisan serve --port=8000
# terminal 2
cd ~/work/hireboard/web && npm run dev
```

Get the id of an open Acme Robotics posting and keep it as `JOB_ID`:

```bash
curl -s 'http://localhost:8000/api/v1/jobs?company=acme-robotics' | jq -r '.data[0].id'
```

Accounts (password `password`): `employer@acme.test` (owns Acme Robotics). Step 2 creates a new
candidate so the run never depends on whether a seeded candidate already has a profile.

Use a private browser window so no earlier session cookie is present.

## Step 1 — Guests can still read the job, applying asks them to sign in (MNC-2)

1. Open `http://localhost:3000/jobs/JOB_ID` without signing in.
   **Expected**: the job detail renders with the company name and an **Apply** link. No redirect.
2. Click **Apply**.
   **Expected**: redirect to `/login?next=%2Fjobs%2FJOB_ID%2Fapply`.

## Step 2 — A candidate without a profile is sent to create one (AC-2, AC-8)

1. Open `http://localhost:3000/register`. Select **Looking for a job** and register with name `Pat Applicant`,
   email `pat.applicant@example.test`, password `password123`.
   **Expected**: you are signed in and land on `/dashboard`.
2. Open `http://localhost:3000/jobs/JOB_ID/apply`, leave the cover letter empty and click
   **Send application**.
   **Expected**: the page stays on the form and shows "Create your candidate profile before you
   apply." with a **Go to your profile** link to `/profile`. Nothing is listed on `/applications`.

## Step 3 — With a profile, the application goes through (AC-1, AC-8)

1. Click **Go to your profile**. Enter the headline `Embedded C++ engineer`, fill the other
   required fields with any valid values, and save.
   **Expected**: "Profile saved".
2. Open `http://localhost:3000/jobs/JOB_ID/apply`, enter the cover letter
   `I built ROS 2 drivers for warehouse robots for three years.` and click **Send application**.
   **Expected**: redirect to `/applications?applied=1` with the green banner "Application sent.
   The employer can now see it." The posting is listed first with today's date and links to the
   job and to `/companies/acme-robotics`.

## Step 4 — A second application to the same job is refused (AC-4)

1. Open `http://localhost:3000/jobs/JOB_ID/apply` again and click **Send application**.
   **Expected**: "You have already applied to this job." and still exactly one entry on
   `/applications`.

## Step 5 — The employer sees the applicant, and only their own applicants (AC-7)

1. Click **Sign out** in the account navigation. Sign in as `employer@acme.test`.
2. Open `http://localhost:3000/employer/applications`.
   **Expected**: Pat Applicant is listed with the headline "Embedded C++ engineer", a
   `mailto:pat.applicant@example.test` link, the cover letter and the job title. No skills, bio or
   years of experience are shown. Applications to Northwind Health or Blue Fern Studio postings
   never appear here.

## Rollback

The change is additive: one new table and three new endpoints. To roll back locally, revert the
merge commits in `web` and then `api`, and run `php artisan migrate:rollback --step=1` in `api/`.
