# Hireboard API contract (v1)

The request and response shapes the web app relies on. **This file is authoritative**: when
`web/` and this file disagree, `web/` is wrong (workspace `CLAUDE.md`, "Contract").
Every endpoint below is registered in `web/lib/api/endpoints.ts` under the name in the
"Registry" column (INV-06). `web/scripts/contract-sync.mjs` checks method and path against
`php artisan route:list --json`; it cannot check shapes, so update this file and
`web/types/api/*.ts` in the same change.

Base URL (local): `http://localhost:8000`. Only the Next.js server calls it (INV-05).

## Conventions

**Envelope (INV-01).** Success:

```json
{ "success": true, "status": 200, "message": "OK", "data": { } }
```

Paginated lists add `meta` (`data` is an array):

```json
{ "success": true, "status": 200, "message": "OK", "data": [ ],
  "meta": { "current_page": 1, "per_page": 20, "total": 8, "last_page": 1 } }
```

Errors never carry `data`:

```json
{ "success": false, "status": 422, "message": "The given data was invalid.", "code": "validation_failed",
  "errors": { "per_page": ["The per page field must be at least 1."] } }
```

- Field names are snake_case. Timestamps are ISO-8601 in UTC (INV-04).
- IDs: domain records are UUID strings (INV-03); users are integers.
- Auth: `Authorization: Bearer <token>` (Sanctum personal access token, ADR-0001). Send
  `Accept: application/json`.
- Pagination query: `page` (default 1), `per_page` (default 20). Search caps `per_page` at 50.
- Rate limits answer 429 `too_many_requests` with a `Retry-After` header.

## Error codes

| Code | HTTP | Raised when |
|------|------|-------------|
| `unauthenticated` | 401 | Missing, invalid, expired or revoked token |
| `forbidden` | 403 | A policy refuses the action (wrong role, not the owner) |
| `not_found` | 404 | Unknown route |
| `job_not_found` | 404 | Posting id unknown, or posting not `open` (BR-10) |
| `company_not_found` | 404 | Company slug unknown |
| `profile_not_found` | 404 | Candidate has no profile yet |
| `review_not_found` | 404 | Review id unknown, or no own review for this company |
| `validation_failed` | 422 | Input validation failed; see `errors` |
| `invalid_credentials` | 422 | Login with a wrong email or password |
| `profile_required` | 422 | Applying without a profile (BR-30) |
| `job_not_open` | 422 | Applying to a draft or closed posting (BR-31) |
| `already_applied` | 409 | Second application to the same posting (BR-32) |
| `review_already_exists` | 409 | Second review of the same company (BR-40) |
| `review_already_moderated` | 409 | Approving or rejecting a review that is not pending (BR-44) |
| `too_many_requests` | 429 | Rate limit hit |
| `method_not_allowed` | 405 | Known route called with the wrong HTTP method |
| `http_error` | other 4xx | Any other client error raised by the framework, with its own status (for example 400 or 419) |
| `service_unavailable` | 503 | Maintenance mode or temporary outage; carries the `Retry-After` header |
| `server_error` | 500 (or the framework's own 5xx) | Unexpected failure. Other 5xx framework exceptions keep their status with this code; the message is generic and never exposes internals |

The web forms map codes to messages, so renaming a code is a breaking change. The last four codes are the catch-all handlers in `bootstrap/app.php`; the web client treats any unrecognised code as `http_error` (see `ApiError` in `lib/api/client.ts`) and shows the envelope `message`.

## Shapes

```text
JobPosting         {id, title, description, location, remote, employment_type,
                    salary: {min, max, currency} | null, status, published_at,
                    company: {id, slug, name, location}}
Company            {id, slug, name, website, location, description, open_jobs_count}
User               {id, name, email, role}
AuthResult         {user: User, token}
CandidateProfile   {id, headline, location, bio, skills[], years_experience, open_to_work, updated_at}
JobApplication     {id, job: {id, title, company: {slug, name}}, cover_letter, submitted_at}
EmployerApplication {id, job: {id, title, status}, candidate: {name, email, headline}, cover_letter, submitted_at}
CompanyReview      {id, rating, title, body, author: "Verified candidate", created_at}
MyCompanyReview    CompanyReview + {status, rejection_reason}
PendingReview      CompanyReview + {status, company: {slug, name}, candidate_name}
```

Enums: `employment_type` is `full_time | part_time | contract | internship`; posting `status`
is `draft | open | closed` (only `open` is ever returned publicly); `role` is
`candidate | employer | admin`; review `status` is `pending | approved | rejected`.
`salary` is `null` when neither bound is set; otherwise either bound may be `null` (BR-12, INV-07).

---

## Jobs and companies (HIRE-1) — `routes/api/v1/jobs.php`

| Method | Path | Registry | Auth | Controller |
|--------|------|----------|------|------------|
| GET | `/api/v1/jobs` | `searchJobs` | public | `Jobs\SearchJobPostingsController` |
| GET | `/api/v1/jobs/{id}` | `showJob` | public | `Jobs\ShowJobPostingController` |
| GET | `/api/v1/companies/{slug}` | `showCompany` | public | `Companies\ShowCompanyController` |

### GET /api/v1/jobs

Open postings only, newest `published_at` first (BR-10, BR-11).

| Query | Type | Notes |
|-------|------|-------|
| `q` | string, max 120 | Substring of title or description |
| `location` | string, max 120 | Substring of location |
| `remote` | `1` or `0` | Omit for both |
| `employment_type` | enum | Unknown value: 422 |
| `company` | slug, max 80 | Only this company's postings |
| `page` | int >= 1 | Default 1 |
| `per_page` | int >= 1 | Default 20; values above 50 are capped to 50; `0`: 422 |

`200` paginated `JobPosting`. `422 validation_failed`.

```bash
curl -s 'http://localhost:8000/api/v1/jobs?remote=1&employment_type=full_time' -H 'Accept: application/json'
```

```json
{
  "success": true, "status": 200, "message": "OK",
  "data": [{
    "id": "9d3c5a1e-6b8f-4f7a-9a51-1c2d3e4f5a6b",
    "title": "Senior Laravel Engineer",
    "description": "Acme Robotics is hiring a Senior Laravel Engineer. ...",
    "location": "Berlin", "remote": true, "employment_type": "full_time",
    "salary": { "min": 65000, "max": 85000, "currency": "EUR" },
    "status": "open", "published_at": "2026-10-18T10:00:00+00:00",
    "company": { "id": "9d3c59f0-...", "slug": "acme-robotics", "name": "Acme Robotics", "location": "Berlin" }
  }],
  "meta": { "current_page": 1, "per_page": 20, "total": 3, "last_page": 1 }
}
```

### GET /api/v1/jobs/{id}

`200` `JobPosting`. `404 job_not_found` when the id is unknown **or the posting is not open**
(draft or closed). The two cases are indistinguishable on purpose (BR-10; regression-tested
since HIRE-9).

### GET /api/v1/companies/{slug}

`200` `Company`. `open_jobs_count` counts open postings only. `404 company_not_found`.
No review fields are added here; the rating lives in the reviews list `meta` (HIRE-4 MNC-1).

---

## Auth (HIRE-3) — `routes/api/v1/auth.php`

| Method | Path | Registry | Auth | Controller |
|--------|------|----------|------|------------|
| POST | `/api/v1/auth/register` | `register` | public, `throttle:6,1` | `Auth\RegisterController` |
| POST | `/api/v1/auth/login` | `login` | public, `throttle:6,1` | `Auth\LoginController` |
| POST | `/api/v1/auth/logout` | `logout` | `auth:sanctum` | `Auth\LogoutController` |
| GET | `/api/v1/auth/me` | `me` | `auth:sanctum` | `Auth\ShowCurrentUserController` |

- **register** body: `name` (max 120), `email`, `password` (min 8), `password_confirmation`,
  `role` (`candidate` or `employer`, BR-01), `company_name` (required when `role=employer`,
  2-120). `201` `AuthResult`; an employer also gets a company (BR-02). `422 validation_failed`
  (also for `role=admin` and for a duplicate email in any case, BR-03).
- **login** body: `email`, `password`. `200` `AuthResult`. `422 invalid_credentials`. `429`.
- **logout**: revokes the current token (BR-04). `204`, no body.
- **me**: `200` `User`. `401 unauthenticated`.

Tokens are named `web` and expire after 7 days (BR-04). The web server stores the token in the
HttpOnly cookie `hireboard_session` and never sends it to the browser (INV-05, ADR-0001).

---

## Reviews (HIRE-4) — `routes/api/v1/reviews.php`

| Method | Path | Registry | Auth | Controller |
|--------|------|----------|------|------------|
| GET | `/api/v1/companies/{slug}/reviews` | `listCompanyReviews` | public | `Reviews\ListCompanyReviewsController` |
| POST | `/api/v1/companies/{slug}/reviews` | `submitCompanyReview` | candidate | `Reviews\SubmitCompanyReviewController` |
| GET | `/api/v1/companies/{slug}/reviews/mine` | `showMyCompanyReview` | candidate | `Reviews\ShowMyCompanyReviewController` |
| GET | `/api/v1/admin/reviews` | `listPendingReviews` | admin | `Reviews\ListPendingReviewsController` |
| POST | `/api/v1/admin/reviews/{id}/approve` | `approveReview` | admin | `Reviews\ApproveReviewController` |
| POST | `/api/v1/admin/reviews/{id}/reject` | `rejectReview` | admin | `Reviews\RejectReviewController` |

- **list**: approved reviews only, newest first, paginated `CompanyReview`. `meta` adds
  `average_rating` (number with 1 decimal, or `null` when there are no approved reviews; BR-43).
  `404 company_not_found`.
- **submit** body: `rating` (1-5), `title` (5-120), `body` (20-2000). `201` `MyCompanyReview`
  with `status: "pending"` (BR-41). `409 review_already_exists` (BR-40), `403` for employers
  and admins, `401`, `404 company_not_found`, `422`.
- **mine**: `200` `MyCompanyReview` (includes `rejection_reason` when rejected). `404 review_not_found`.
- **admin list**: pending reviews, oldest first, paginated `PendingReview`. `403` for non-admins.
- **approve**: `200` `PendingReview` with `status: "approved"`. `409 review_already_moderated`,
  `404 review_not_found`, `403`.
- **reject** body: `reason` (5-255). `200` with `status: "rejected"`. `409`, `404`, `403`, `422`.

---

## Candidate profiles (HIRE-5) — `routes/api/v1/profiles.php`

| Method | Path | Registry | Auth | Controller |
|--------|------|----------|------|------------|
| GET | `/api/v1/me/profile` | `showMyProfile` | candidate | `Profiles\ShowMyProfileController` |
| PUT | `/api/v1/me/profile` | `upsertMyProfile` | candidate | `Profiles\UpsertMyProfileController` |

- **show**: `200` `CandidateProfile`. `404 profile_not_found` before the first save. `403`
  for non-candidates (BR-20). `401`.
- **upsert** body: `headline` (3-120), `location` (max 120, optional), `bio` (max 2000,
  optional), `skills` (array of up to 20 unique strings, each max 40), `years_experience`
  (0-60), `open_to_work` (boolean). Creates on first save, updates after. `200`
  `CandidateProfile`. `422`, `403`, `401`.

---

## Applications (HIRE-6) — `routes/api/v1/applications.php`

| Method | Path | Registry | Auth | Controller |
|--------|------|----------|------|------------|
| POST | `/api/v1/jobs/{id}/applications` | `submitApplication` | candidate | `Applications\SubmitApplicationController` |
| GET | `/api/v1/me/applications` | `listMyApplications` | candidate | `Applications\ListMyApplicationsController` |
| GET | `/api/v1/employer/applications` | `listEmployerApplications` | employer | `Applications\ListEmployerApplicationsController` |

- **submit** body: `cover_letter` (optional, max 2000). `201` `JobApplication`.
  `404 job_not_found` (unknown id), `422 profile_required` (BR-30), `422 job_not_open`
  (BR-31), `409 already_applied` (BR-32, also for a concurrent duplicate), `403` for
  non-candidates, `401`.
- **mine**: paginated `JobApplication`, newest first. `403`, `401`.
- **employer**: paginated `EmployerApplication` for postings of the employer's own company,
  closed postings included (BR-33). Candidate data is limited to name, email and headline
  (BR-21). `403`, `401`.
