# Hireboard architecture

Lightweight ADR for the overall design, written by greenfield-build's Handoff phase for
HIRE-1 (2026-10-19). Individual decisions with real alternatives get
their own ADR in `docs/adr/` (ADR-0001: SPA auth).

## Context

Hireboard is a small job board (`../product-brief.md` in the workspace). A small team: a
developer (Alex Rivera) at the start, more joining later (see the team chapter), and one
product owner (Maya Chen). The first slice had to prove the whole stack: a visitor
searches open jobs with filters and opens one.

## Constitution

The principles every decision below was checked against. They come from the workspace
`CLAUDE.md` (INV-01..INV-07) and the kit skills `laravel-12`, `dto-first`,
`service-repository`, `schema-first`, `api-design`, `nextjs-15`, `typescript` and
`tailwind-4`, plus `architecture-patterns` for the layering.

1. Controllers stay thin: single-action invokable controllers, business logic in services (INV-02).
2. DTOs at every layer boundary; repositories return DTOs, never Eloquent models (INV-02).
3. Schema documented in `docs/schemas/` before the migration.
4. One response envelope for every endpoint, success and error (INV-01).
5. The browser never talks to the API or holds a token (INV-05).
6. Every endpoint the browser needs is listed in one registry and one contract doc (INV-06).
7. Dependencies point inward: controllers depend on services, services on repository interfaces, never the reverse.
8. TypeScript runs strict and response types mirror the API exactly, with enum literal unions.
9. Styling uses Tailwind utility classes only; no custom CSS beyond `globals.css`.

## Decisions

| # | Decision | Rationale | Alternatives considered |
|---|----------|-----------|-------------------------|
| A1 | **Split repos** `api/` (Laravel 12) and `web/` (Next.js 15) in a parent-folder workspace with no git | Independent CI and deploys; matches the kit's multi-repo pattern | Monorepo (one CI, but mixed toolchains); Laravel + Inertia (no separate frontend, but the team wants App Router) |
| A2 | **Layers** `route → invokable controller → service (DTOs) → repository interface → Eloquent` | Constitution 1-2; services stay testable without HTTP | Fat controllers; Action classes without repositories |
| A3 | **Domain tables use UUID primary keys (`HasUuids`); `users` keeps bigint ids** (INV-03) | Non-guessable public ids for postings, companies, reviews; Sanctum's `personal_access_tokens.tokenable_id` and the default users migration stay unchanged | UUIDs everywhere (needs custom Sanctum morphs); bigint everywhere (enumerable job URLs) |
| A4 | **Spatie Laravel Data v4 for DTOs** in `App\DTOs`: `validateAndCreate()` for input, `fromModel()` + `toApiArray()` for output | Validation and typing in one class; the API shape is explicit code, not a Resource with implicit fields | Form requests + API resources (two classes per endpoint) |
| A5 | **Routes per feature**: `routes/api.php` prefixes `v1` and requires every `routes/api/v1/*.php` | Parallel feature branches don't conflict on one route file | One `routes/api.php` |
| A6 | **Errors as exceptions**: domain errors extend `BusinessRuleException` (`status()`, `errorCode()`); `bootstrap/app.php` renders them and framework errors in the INV-01 error envelope | Services never build HTTP responses; every error has a stable machine code | Returning error DTOs from services; per-controller try/catch |
| A7 | **Next.js as a BFF**: Server Components fetch through `web/lib/api/client.ts` (`server-only`) using `web/lib/api/endpoints.ts`; no `NEXT_PUBLIC_` API URL | INV-05, no CORS; one place to attach the token later | Browser calls the API directly (needs CORS and a browser-held token) |
| A8 | **No caching in v1**: every fetch is `cache: 'no-store'`, pages are dynamic | Job status must be live (a closed job must disappear at once); traffic is small | ISR with revalidate tags (premature) |
| A9 | **SQLite** for local dev (`database/database.sqlite`) and tests (`:memory:` from `phpunit.xml`) | Zero setup for a two-person team | MySQL in Docker/DDEV (closer to production; revisit before launch) |
| A10 | **Auth deferred** out of the first slice, decided in ADR-0001 (HIRE-2) | The slice is public; auth has real alternatives worth a separate decision | Pick Sanctum SPA cookies now |

The Architecture phase's three verification votes (principle adherence, simplicity, stack
fit) all held. The simplicity vote flagged the repository interfaces as optional for a slice
this small; they stay because INV-02 requires them and later features need them.

## Data model

```
users (bigint)  1 ──owns── 0..1  companies (uuid) 1 ──< job_postings (uuid)
                                    │                    │
                                    └──< company_reviews └──< job_applications >── users
users 1 ── 0..1 candidate_profiles
```

Tables are documented in `docs/schemas/`. The first slice created `companies` and
`job_postings`; the rest arrived with HIRE-3 to HIRE-6.

## Request flow (first slice)

```
GET /jobs?remote=1                       (browser → Next.js, port 3000)
  app/jobs/page.tsx                      await searchParams → parseJobFilters()
  lib/api/jobs.ts searchJobs()           → apiFetch('searchJobs', { query })
  lib/api/client.ts                      GET {API_BASE_URL}/api/v1/jobs?remote=1, cache: 'no-store'
GET /api/v1/jobs?remote=1                (Next.js server → Laravel, port 8000)
  routes/api/v1/jobs.php
  Jobs\SearchJobPostingsController       JobSearchDTO::validateAndCreate()
  JobPostingService::search()            caps per_page at 50 (BR-11)
  JobPostingRepositoryInterface::searchOpen()   status = open (BR-10), newest first
  JsonResponseTrait::paginated()         INV-01 envelope + meta
```

## Where things live

| Concern | api | web |
|---------|-----|-----|
| Entry | `routes/api/v1/*.php` | `app/**/page.tsx` |
| Business logic | `app/Services/` | none (server actions only call the API) |
| Data access | `app/Repositories/` behind `app/Contracts/` | `lib/api/*.ts` through `lib/api/client.ts` |
| Shapes | `app/DTOs/` (`toApiArray()`) | `types/api/*.ts` (mirror) |
| Errors | `app/Exceptions/`, rendered in `bootstrap/app.php` | `ApiError` in `lib/api/client.ts`, `error.tsx`, `not-found.tsx` |
| Contract | `docs/api/api-contracts.md` | `lib/api/endpoints.ts` |

## Consequences

- Each new feature adds a route file, a service, a repository + interface (bound in
  `RepositoryServiceProvider::$bindings`), DTOs and a Pest feature test folder.
- Frontend types are hand-written mirrors. Contract drift on paths and methods is caught by
  contract-sync in CI; shape drift is caught only by review and the web types. Generating
  types from the API is a candidate ADR when the contract grows.
- SQLite hides some production differences (case-insensitive `LIKE`, no strict column
  lengths). Revisit A9 before the first deploy.
