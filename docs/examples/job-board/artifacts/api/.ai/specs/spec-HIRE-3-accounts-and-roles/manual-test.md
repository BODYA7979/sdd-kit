# Accounts and roles — manual test

**Spec**: spec-HIRE-3-accounts-and-roles | **Ticket**: HIRE-3

## Preconditions

1. API running with fresh demo data (local only, this wipes the database):

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

3. Use a private browser window so no old `hireboard_session` cookie is present.

Demo accounts (password `password`): `candidate@hireboard.test`, `employer@acme.test`,
`admin@hireboard.test`. Register and login share a limit of 6 requests per minute per client; wait a
minute if a step answers "Too many attempts".

### Step 1

A new candidate registers and lands on the dashboard (AC-1 through the UI).

1. Open http://localhost:3000/register.
2. Leave "Looking for a job" selected. Enter name `Dana Candidate`, email `Dana@Example.test`,
   password `secret-pass` twice. Click **Create account**.

**Expected**: the browser ends on http://localhost:3000/dashboard with the heading "Welcome, Dana
Candidate" and "Signed in as dana@example.test" (lowercased). The account nav shows Dashboard,
Profile, Applications, "Dana Candidate · candidate" and **Sign out**.

### Step 2

The session cookie is HttpOnly and the token never reaches browser JavaScript (AC-10).

1. Still signed in from step 1, open DevTools → Application → Cookies → `http://localhost:3000`.
2. In the Console, run `document.cookie`.
3. In the Network tab, reload `/dashboard` and filter by `8000`.

**Expected**:
- A `hireboard_session` cookie exists with **HttpOnly** ticked, **SameSite** `Lax`, Path `/`, and an
  expiry 7 days from now. **Secure** is not ticked on `localhost` (it is set in production builds).
- `document.cookie` does not contain `hireboard_session`.
- No request from the browser goes to `localhost:8000`. The Next.js server calls the API.

### Step 3

An employer registers together with a company; a taken slug gets a suffix (AC-2 end to end).

1. Click **Sign out**. Open http://localhost:3000/register.
2. Select "Hiring for my company". A **Company name** field appears. Enter name `Erin Two`, email
   `erin2@example.test`, company name `Acme Robotics`, password `secret-pass` twice. Submit.
3. Run:

   ```bash
   curl -s localhost:8000/api/v1/companies/acme-robotics-2 | jq '.data | {slug, name}'
   ```

**Expected**: the dashboard shows the employer nav (Dashboard, Applications). The `curl` prints
`{"slug": "acme-robotics-2", "name": "Acme Robotics"}` because the seeded Acme Robotics already owns
`acme-robotics`. Submitting the employer form with an empty company name instead shows an error under
**Company name** and creates nothing.

### Step 4

Guests are sent to the login page with a return path (AC-11).

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/dashboard
```

Then, in the private window after signing out, open http://localhost:3000/dashboard.

**Expected**: `307 http://localhost:3000/login?next=%2Fdashboard`. In the browser the address bar shows
`/login?next=%2Fdashboard`. Signing in there as `candidate@hireboard.test` / `password` lands on
`/dashboard`.

### Step 5

Public job browsing is unchanged for guests (MNC-2).

1. Sign out. Open http://localhost:3000/jobs.
2. Click any job title.

**Expected**: the job list and the job detail page render without a redirect to `/login`, with the
same 8 open jobs as before HIRE-3. The header still shows **Sign in** and **Dashboard** links.

### Step 6

Sign-out revokes the token (AC-7 end to end).

1. Sign in as `employer@acme.test` / `password`.
2. In DevTools → Application → Cookies, copy the `hireboard_session` value.
3. Click **Sign out**, then run (replace `<token>`):

   ```bash
   curl -s -H 'Accept: application/json' -H 'Authorization: Bearer <token>' localhost:8000/api/v1/auth/me | jq '{status, code}'
   ```

**Expected**: after **Sign out** the browser is on `/login` and the cookie is gone. The `curl` prints
`{"status": 401, "code": "unauthenticated"}`.

### Step 7

Wrong credentials and throttling show readable messages (AC-6, AC-9 in the UI).

1. On http://localhost:3000/login enter `candidate@hireboard.test` with password `wrong-pass`. Submit.
2. Submit the same wrong password six more times within a minute.

**Expected**: the first attempts show "Email or password is incorrect." above the form. Once the
limit is hit the form shows "Too many attempts. Wait a minute and try again." After a minute the
correct password works again.

## Rollback

The change is additive: one new column with a default, new routes and new pages. To roll
back, revert both PRs (web first, then api) and run `php artisan migrate:rollback --step=1` on the
API to drop `users.role`. Existing job endpoints do not depend on it.
