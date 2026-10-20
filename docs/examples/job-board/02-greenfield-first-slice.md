# 02 — New app: greenfield-build scaffolds both repos and ships the first slice (HIRE-1)

**Date in the story:** 2026-10-19. **Who:** Alex Rivera (developer), Maya Chen (product owner,
validates the business rules at the end). **Route:** `new app` → `greenfield-build`.
**Ticket:** HIRE-1, "New Hireboard app with first slice: visitor searches open jobs and opens one".

The workspace from [chapter 01](01-workspace-and-install.md) is ready: `~/work/hireboard/` holds
`CLAUDE.md` and `product-brief.md`, and `api/` and `web/` don't exist yet. This chapter runs
one workflow that creates both repos, wires CI, and builds one vertical slice through both of
them. After that, Alex gives each repo its own project context and moves the validated rules
into the API repo.

What you get at the end:

| Repo | Contents |
|------|----------|
| `api/` | Laravel 12 + Sanctum + Laravel Data + Pest 3 + Larastan, CI, three public endpoints (`GET /api/v1/jobs`, `/jobs/{id}`, `/companies/{slug}`), seeded demo data, 8 feature tests |
| `web/` | Next.js 15 App Router + Tailwind 4 + Vitest, CI, `/jobs` with filters, `/jobs/[id]`, a typed server-only API client |

Finished files for this chapter are under [`artifacts/api/`](artifacts/api/) and
[`artifacts/web/`](artifacts/web/). The full list is at the end of
[Step 8](#step-8-read-the-artifacts-as-final-state).

---

## Step 1: Start `/sdd` from the workspace root

```bash
cd ~/work/hireboard
claude                     # add --plugin-dir ~/tools/sdd-kit/plugins/sdd-kit for a local checkout
```

In plugin mode the skill is `/sdd-kit:sdd` (friction F5, see chapter 01). The walkthrough
writes `/sdd`.

```
/sdd HIRE-1: New Hireboard app — Laravel API + Next.js frontend; first slice: visitor searches open jobs with filters and opens one
```

`/sdd` resolves the input first (Step 1 of `src/skills/sdd/SKILL.md`). `HIRE-1` is a
ticket key, so it looks for an existing spec folder and then for a tracker. Neither exists
(friction F8), so it uses the text you typed as the ticket text and skips link-back. Then it
classifies.

Simulated output (abridged):

```
No spec matches HIRE-1 (.ai/specs/ does not exist).
No Jira/Linear MCP server or CLI in this session. Using the text you gave as the ticket text;
tracker link-back will be skipped.

Route: new app
Reason: no application code exists yet: api/ and web/ are absent; the workspace holds only
        CLAUDE.md and product-brief.md.

? Which route should HIRE-1 take?
  ❯ new app (recommended): greenfield-build scaffolds the repos and ships one vertical slice
    feature: write-spec → approval → ship-feature (needs an existing codebase)
```

Alex picks **new app**. Background workflows can't stop to ask questions, so `/sdd` collects
every input now. The `new app` reference (`references/greenfield-build.md`) says to ask for
the stack, single vs split repos, the first slice and hard constraints, and to have the user
approve the architecture direction. Alex answers:

| Question | Answer |
|----------|--------|
| Stack | Laravel 12 API + Next.js 15 App Router |
| Single or split repos | Split: `api/` and `web/`, siblings in this workspace (the layout in `CLAUDE.md`) |
| Dev URL for browser acceptance | `http://localhost:3000` |
| First slice | A visitor searches open postings by keyword, location, remote and employment type, can filter by company, and opens a job detail page that shows the hiring company |
| Hard constraints | SQLite; no auth in this slice (ADR-0001 decides it next); API under `/api/v1` with the `{success, status, message, data}` envelope |

`/sdd` then plays the direction back, built from the answers plus the workspace `CLAUDE.md`
it already has loaded:

```
Architecture direction (approve before launch):
- Two repos: api/ = Laravel 12 JSON API, web/ = Next.js 15 App Router acting as a BFF
  (the browser never calls :8000, INV-05)
- api layers: invokable controller → service (Laravel Data DTOs) → repository interface → Eloquent (INV-02)
- Domain tables with UUID keys, users stays bigint (INV-03)
- First slice touches both repos: backend first, then frontend
- Auth is out of scope for this slice

? Approve this direction?  ❯ Approve   Change something
```

Alex approves.

---

## Step 2: Launch `greenfield-build`

Before any `Workflow` call, `/sdd` shows the exact call and warns that it runs many agents in
the background:

```js
Workflow({ name: "greenfield-build", args: {
  idea: "HIRE-1: Hireboard job board. Laravel 12 API in api/ and Next.js 15 App Router frontend in web/. First slice: a visitor searches open job postings by keyword, location, remote and employment type, filters by company, and opens a job detail page that shows the hiring company. Seed demo companies and postings. No auth in this slice. SQLite. API under /api/v1 with the { success, status, message, data } envelope. Conventions from CLAUDE.md and product-brief.md.",
  stack: "laravel",
  repos: { backend: "api", frontend: "web" },
  url: "http://localhost:3000"
} })
```

The arguments come from the top of `src/workflows/greenfield-build.js`: `idea`, `stack`,
`repos`, `url`, plus `force` and `models`, which this run doesn't need.

> **Friction F4: `stack` takes one registry key.** The value is a single key from the `STACKS`
> registry (`laravel`, `nextjs`, `drupal`, ...), not a list. You can't pass
> `"laravel+nextjs"`. The Detect phase works out the frontend stack itself: it gets
> `repos.frontend = "web"` and an idea that says "Next.js 15 App Router", matches them against
> the registry catalog, and records `web` as `nextjs`. Put the backend key in `stack` and
> name the frontend framework in `idea`.

Alex agrees, and `/sdd` hands off:

```
Route:     new app (confirmed)
Ticket:    HIRE-1
Launched:  greenfield-build: runs in the background; watch with /workflows
Done when: SHIP-SLICE: the slice passes gates and acceptance
```

Watch it with:

```
/workflows
```

The run takes a while: Scaffold installs Composer and npm dependencies, and Gates runs every
gate in both repos, possibly more than once. Leave the session open. The phases log one line
each as they finish.

---

## Step 3: What each phase does

The phases below are the `meta.phases` of `greenfield-build.js`. The log lines use the
workflow's own `log()` formats. All output is **simulated** and abridged.

### Detect

A `code-explorer` agent probes both targets. Its prompt asks for `git -C <path> ls-files`, but
the shipped `code-explorer` agent is read-only (Read, Grep, Glob), so it cannot run git
unless your setup grants it Bash. Here both directories are missing, so there is nothing to
find either way (Glob matches no files), and the target counts as greenfield.

```
Detect: backend:laravel@api, frontend:nextjs@web (split); greenfield=true
```

If `api/` or `web/` already contained source files, the run would stop here with `BLOCKED`.
That is why chapter 01 never creates them (friction F1). Treat the git-tracked check as
best effort: with the read-only agent the file-presence check is what actually protects you.

### Constitution

A `deep`-tier agent turns the conventions into testable principles before any architecture is
decided. It reads the workspace `CLAUDE.md`, which loads the invariants INV-01..INV-07 and
points to `product-brief.md`. It also consults the kit skills for the detected stacks.

```
Constitution: 9 principle(s), skills: laravel-12, service-repository, dto-first, api-design, schema-first, nextjs-15, typescript, tailwind-4, architecture-patterns
```

Principles it returned (abridged): "controllers are single-action and invokable; logic lives
in services", "DTOs at every layer boundary, repositories return DTOs", "schema documented in
`docs/schemas/` before the migration", "one envelope for success and error (INV-01)", "the
browser never calls the API (INV-05)", "every browser-facing endpoint is in one registry
(INV-06)".

### Architecture, with a 3-vote verify

One `deep` agent proposes the architecture, then three `standard` agents try to refute it
through three lenses: `principle-adherence`, `simplicity` and `stack-fit`. A majority of
"holds up" votes marks it sound.

```
Architecture: slice "Visitor searches open jobs and opens one" — sound (2/3)
```

What it decided, and what ended up in [`api/docs/architecture.md`](artifacts/api/docs/architecture.md):

- **Layout:** `split`, `api/` and `web/`.
- **Layers:** `route → invokable controller → service (DTOs) → repository interface → Eloquent`,
  and `app router page (Server Component) → lib/api → API`.
- **Data model sketch:** `companies` (uuid, slug, owner_id nullable) and `job_postings` (uuid,
  status, published_at, salary_* integers).
- **First slice:** entry point `/jobs`, expected end state "the visitor filters by Remote,
  opens a card and sees the job with its company".
- **Decisions:** domain tables use UUIDs while `users` keeps bigint ids, so Sanctum works
  unchanged (A3); auth is deferred to a separate decision, which becomes ADR-0001 in
  [chapter 03](03-decision-spa-auth-adr.md) (A10).

The simplicity voter refuted it, with the reason that repository interfaces are more than one
slice needs. Two of three still voted "holds up", so the architecture stands and keeps the
interfaces because INV-02 requires them. The workflow passes the reasons of refuting votes to
the final report as concerns, so read them there.

### Scaffold

Two agents run in parallel, one per repo (`laravel-backend-dev` for `api`,
`nextjs-frontend-dev` for `web`, from the registry's `agent` field). Each creates the
skeleton, the layer folders and a CI workflow, then commits the scaffold as the first
checkpoint. These are the commands the agents ran. If a scaffold fails, rerun them by hand
from `~/work/hireboard`:

```bash
composer create-project laravel/laravel:^12.0 api
cd api && php artisan install:api --without-migration-prompt
composer require spatie/laravel-data:^4.0
composer require --dev pestphp/pest:^3.0 pestphp/pest-plugin-laravel:^3.0 larastan/larastan:^3.0 -W && ./vendor/bin/pest --init
git init && git add -A && git commit -m "chore: scaffold Laravel 12 API"
cd ..

npx create-next-app@15 web --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --no-turbopack
cd web && npm install server-only && npm install -D vitest && npm pkg set scripts.test="vitest run"
```

> **Tip: vitest and `@types/node`.** `create-next-app@15` pins `@types/node` to `^20`. A
> recent `vitest` major can declare a peer range that excludes it, and then
> `npm install -D vitest` fails with `ERESOLVE`. Install the previous major instead
> (`npm install -D vitest@^3`). Don't use `--legacy-peer-deps`.

```
Scaffold: 63 path(s) created, CI configured
```

Each scaffold agent also writes a minimal `CLAUDE.md` and `.mcp.json` into its repo if none
exists (step 2 of the Scaffold prompt). Step 5 below replaces those `CLAUDE.md` files with
the kit templates.

The CI files are [`api/.github/workflows/ci.yml`](artifacts/api/.github/workflows/ci.yml) and
[`web/.github/workflows/ci.yml`](artifacts/web/.github/workflows/ci.yml). Each one runs exactly
that repo's gates from the kit's `STACKS` registry, which the Scaffold agents report back as
`gateCommands`:

| Repo | Gates |
|------|-------|
| `api` | `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --no-progress`, `php artisan test` |
| `web` | `npm run lint`, `npx tsc --noEmit`, `npm test`, plus `npm run build` in CI |

`phpstan analyse` needs a config, so the API scaffold adds
[`api/phpstan.neon`](artifacts/api/phpstan.neon) (Larastan, level 5).

### Slice: TDD, backend before frontend

The workflow builds the repos one after another: every non-frontend target first, then the
frontend, each with "failing test first, then make it pass". The backend agent writes the
Pest tests, sees them fail, then adds the schema docs, migrations, models, DTOs, repositories,
services, controllers and the route file. The frontend agent starts from a Vitest test for the
URL-to-filter parsing, then builds the client, the registry, the pages and the components.
Step 4 walks through the code.

```
Slice: 2/2 part(s) built
```

### Gates

Gates run per repo, in parallel. A failing gate triggers a fix round (at most three), and the
fixer is told to fix the code, not suppress the error.

```
Gates round 1: fixing 1 failing gate(s)
```

Round 1 in this run: PHPStan reported that `JobPostingDTO::fromModel()` passed a `string`
where `EmploymentType`, `JobPostingStatus` and `CarbonInterface` were expected. Larastan had
resolved those attributes from the migration column types for these two models. The fixer didn't
loosen the DTO types. It added `@property` docblocks to `Company` and `JobPosting` that state
the cast types, and the second gate run was green in both repos. Whether a model needs such
docblocks depends on the model and the Larastan version, so add them only where PHPStan
reports the mismatch.

### Acceptance

A `deep` agent ignores the passing unit tests and walks the real journey. It boots
`php artisan serve --port=8000` and `npm run dev`, then drives `http://localhost:3000`:

```
Acceptance: RESOLVED
  ✓ /            → redirects to /jobs, "8 jobs match your search."
  ✓ Remote only  → /jobs?remote=1, 4 cards, each with a "Remote" badge
  ✓ open card    → /jobs/9d3c…, title, company name, location, type, Apply button
  ✓ unknown id   → /jobs/00000000-…, the not-found page
```

Acceptance follows each hop of the slice's journey from the entry point to the expected end
state. A hop whose target doesn't resolve is recorded as a broken link and fails the slice.
Links that aren't on the journey aren't followed. That shaped two choices on the day-one
detail page:

- The company name is plain text. The careers page `/companies/[slug]` and the link to it
  arrive with HIRE-7 ([chapter 08](08-careers-page-s-spec-and-trivial-change.md)).
- The **Apply** button links to `/jobs/[id]/apply`, which HIRE-6 builds
  ([chapter 07](07-applications-and-deep-review.md)). It sits past the slice's end state, so
  the agent didn't follow it. It recorded the link in its notes, and the report repeats it.
  Read the acceptance notes, not just the verdict.

### Handoff

```
Handoff: 3 doc(s) written
```

The docs go into the primary repo, `api/`:

- [`api/docs/getting-started.md`](artifacts/api/docs/getting-started.md): install, run and gate commands for both repos
- [`api/docs/architecture.md`](artifacts/api/docs/architecture.md): constitution, decisions A1-A10 with alternatives, request flow
- [`api/docs/manual-test.md`](artifacts/api/docs/manual-test.md): eleven action → expected steps for the browse journey

### Report

The workflow returns the report (abridged):

```
## Recommendation: SHIP-SLICE
Scaffold complete in both repos (CI configured, scaffold committed), slice complete,
all gates green in both repos, acceptance resolved, architecture sound (2/3).

Verify concern (simplicity): repository interfaces are heavier than the slice needs;
kept for INV-02.

## Next slices (run each through /sdd)
1. HIRE-3 Accounts and roles: registration, login, logout, me (decide SPA auth first: HIRE-2)
2. HIRE-4 Company reviews with moderation
3. HIRE-5 Candidate profiles
4. HIRE-6 Job applications
5. HIRE-7 Company careers page (/companies/[slug])

Acceptance note: the Apply button on /jobs/[id] points at /jobs/[id]/apply, which HIRE-6 builds.
```

`SHIP-SLICE` is the `new app` route's definition of done. The remaining steps are Alex's.

---

## Step 4: Read the slice code

The finished code is in the artifacts. These excerpts show how a request moves through it.

### API: one request, four layers

`routes/api.php` contains no routes. It prefixes `v1` and loads one file per feature, so later
feature branches each add their own file and never touch a shared one
([`artifacts/api/routes/api.php`](artifacts/api/routes/api.php)):

```php
Route::prefix('v1')->group(function (): void {
    foreach (glob(__DIR__.'/api/v1/*.php') ?: [] as $routeFile) {
        require $routeFile;
    }
});
```

[`routes/api/v1/jobs.php`](artifacts/api/routes/api/v1/jobs.php) maps the three public
endpoints to invokable controllers. The search controller builds the input DTO and calls one
service method. `$request->boolean()` handles `remote=0`, which would otherwise be a truthy
string (GOTCHA-03 in `api/CLAUDE.md`):

```php
// app/Http/Controllers/Jobs/SearchJobPostingsController.php
public function __invoke(Request $request): JsonResponse
{
    $filters = JobSearchDTO::validateAndCreate([
        ...$request->only(['q', 'location', 'employment_type', 'company', 'page', 'per_page']),
        'remote' => $request->filled('remote') ? $request->boolean('remote') : null,
    ]);

    return $this->paginated($this->jobs->search($filters));
}
```

[`JobSearchDTO`](artifacts/api/app/DTOs/JobSearchDTO.php) maps snake_case input to camelCase
properties with `#[MapInputName(SnakeCaseMapper::class)]`. It also validates: an unknown
`employment_type` or `per_page=0` produces a `ValidationException`, which `bootstrap/app.php`
renders as 422 `validation_failed`.
[`JobPostingService::search()`](artifacts/api/app/Services/JobPostingService.php) caps
`per_page` at 50 (BR-11) and calls the repository through its interface.
[`JobPostingRepository::searchOpen()`](artifacts/api/app/Repositories/JobPostingRepository.php)
is the only place that knows about Eloquent. It filters on `status = open` (BR-10), sorts
newest first, and maps every row to a `JobPostingDTO`. The binding lives in
[`RepositoryServiceProvider::$bindings`](artifacts/api/app/Providers/RepositoryServiceProvider.php),
registered in [`bootstrap/providers.php`](artifacts/api/bootstrap/providers.php).

Responses go out through [`JsonResponseTrait`](artifacts/api/app/Http/Traits/JsonResponseTrait.php),
which the base `Controller` uses. `paginated()` serializes each DTO with `toApiArray()` and
adds the INV-01 meta:

```json
{ "success": true, "status": 200, "message": "OK", "data": [ { "id": "9d3c…", "title": "Senior Laravel Engineer", "…": "…" } ],
  "meta": { "current_page": 1, "per_page": 20, "total": 8, "last_page": 1 } }
```

Errors take the other path. A service throws a `BusinessRuleException` subclass, such as
[`JobPostingNotFoundException`](artifacts/api/app/Exceptions/JobPostingNotFoundException.php)
(404, `job_not_found`). [`bootstrap/app.php`](artifacts/api/bootstrap/app.php) renders it, and
also validation, 401, 403, 404 and 429 errors, in one error envelope for everything under
`api/*`. No controller catches anything.

The tests pin the behavior:
[`SearchJobPostingsTest`](artifacts/api/tests/Feature/Jobs/SearchJobPostingsTest.php)
('lists only open postings newest first', 'filters by keyword, location, remote, employment
type and company', 'caps per_page at 50', 'returns the pagination meta'),
[`ShowJobPostingTest`](artifacts/api/tests/Feature/Jobs/ShowJobPostingTest.php) and
[`ShowCompanyTest`](artifacts/api/tests/Feature/Companies/ShowCompanyTest.php).
[`tests/Pest.php`](artifacts/api/tests/Pest.php) applies `RefreshDatabase` to every feature
test.

### Web: a Server Component, a parser, one client

[`app/jobs/page.tsx`](artifacts/web/app/jobs/page.tsx) awaits the Next 15 `searchParams`
promise, parses it, and fetches on the server. Reading `searchParams` makes the page
dynamic, so `npm run build` never calls the API:

```tsx
export default async function JobsPage({ searchParams }: JobsPageProps) {
  const filters = parseJobFilters(await searchParams);
  const { data: jobs, meta } = await searchJobs(filters);
  // ...JobFilters, a list of JobCard, Previous/Next links built with toQueryString()
}
```

[`lib/search-params.ts`](artifacts/web/lib/search-params.ts) drops empty and unknown values,
so a hand-edited URL never turns into an API 422. It is the one piece of pure logic, and the
Vitest test covers it ([`lib/search-params.test.ts`](artifacts/web/lib/search-params.test.ts)).

[`lib/api/jobs.ts`](artifacts/web/lib/api/jobs.ts) calls `apiFetch('searchJobs', { query })`.
[`lib/api/client.ts`](artifacts/web/lib/api/client.ts) starts with `import 'server-only'`,
looks the endpoint up in the registry, and builds the URL from the server-only
`API_BASE_URL`. It always fetches with `cache: 'no-store'`, so a posting that closes
disappears on the next request, and it throws `ApiError { status, code, errors }` on any
non-2xx response. `getJob()` turns a 404 into `null`, and
[`app/jobs/[id]/page.tsx`](artifacts/web/app/jobs/%5Bid%5D/page.tsx) turns `null` into `notFound()`.

```ts
// lib/api/endpoints.ts: the INV-06 registry (excerpt)
export const endpoints = {
  searchJobs: { method: 'GET', path: '/api/v1/jobs' },
  showJob: { method: 'GET', path: '/api/v1/jobs/{id}' },
  showCompany: { method: 'GET', path: '/api/v1/companies/{slug}' },
  // ...
} as const satisfies Record<string, EndpointDefinition>;
```

[`JobFilters`](artifacts/web/components/job-filters.tsx) is a GET form (`next/form`), not a
client component with state. Submitting it navigates to `/jobs?…`, so every search is a
shareable URL. [`JobCard`](artifacts/web/components/job-card.tsx) renders one posting.
[`types/api/jobs.ts`](artifacts/web/types/api/jobs.ts) mirrors the API shape field for field,
with enum literal unions copied from `App\Enums`.

---

## Step 5: Give each repo its own context

The Constitution phase could only use the workspace context. From now on, sessions started
inside `api/` or `web/` (chapters 03, 07, 10) need each repo's own conventions, and the root
`@api/CLAUDE.md` / `@web/CLAUDE.md` imports need real files.

> **Friction F5: plugin mode installs no project context.** The kit's plugin ships agents,
> skills, workflows and hooks, but no `CLAUDE.md`, `AGENTS.md` or `.claude/rules/`. Copy the
> templates by hand, as
> [INSTALLATION.md, "Project context is not installed"](../../reference/installation.md#project-context-is-not-installed)
> describes. **File-copy users** run `~/tools/sdd-kit/install.sh --project`
> inside `api/` and inside `web/` now instead. The installer creates `AGENTS.md` and
> `.claude/rules/` when they're missing, and a `CLAUDE.md` when none exists. Delete the
> scaffold's stub `CLAUDE.md` first if you want the template.

```bash
KIT=~/tools/sdd-kit
for repo in api web; do
  cd ~/work/hireboard/$repo
  cp $KIT/src/CLAUDE.template.md CLAUDE.md          # replaces the scaffold's stub
  cp $KIT/src/templates/AGENTS.template.md AGENTS.md
  mkdir -p .claude/rules && cp $KIT/src/templates/rules/*.md .claude/rules/
done
```

Then fill them in. The templates say to keep `CLAUDE.md` under 200 lines, put tool-neutral
facts in `AGENTS.md` (imported with `@AGENTS.md`), and state each fact once.
[GETTING-STARTED.md, section 2](../../reference/getting-started.md#2-give-claude-your-project-context)
explains the reasoning.

**`api/AGENTS.md`** ([artifact](artifacts/api/AGENTS.md)): the stack table, the three gate
commands exactly as CI runs them, and the red lines. The template's generic red lines become
specific ones: never `migrate:fresh` outside the local SQLite file, never expose a draft or
closed posting or a reviewer's identity (BR-10, BR-42), never return a model from a
repository. The architecture section states the conventions from Step 4 as rules.

**`api/CLAUDE.md`** ([artifact](artifacts/api/CLAUDE.md)): "Always load" points at business
rules, architecture and the API contract, and a task-routing table sends each
kind of work to the right doc and rule file. It also holds the invariants INV-01..INV-07 and
the gotchas, starting with:

```markdown
- **GOTCHA-01** Tests use SQLite `:memory:` from `phpunit.xml`, not `.env`. A test that
  passes locally against `database/database.sqlite` was not run through `php artisan test`.
```

**`web/AGENTS.md`** and **`web/CLAUDE.md`** ([artifact](artifacts/web/AGENTS.md),
[artifact](artifacts/web/CLAUDE.md)) are the counterparts: the four web gates, red lines
around the token and the registry (INV-05, INV-06), and gotchas such as "a page that reads no
request data is prerendered at build time".

Two edits to the copied rules files, because the templates assume paths this project doesn't
use:

- `api/.claude/rules/api-controllers.md`: add `"routes/api/**"` to `paths:`, so the rule loads
  for the per-feature route files.
- `web/.claude/rules/frontend-pages.md`: replace `src/components/**` and `src/lib/api/**` with
  `components/**` and `lib/api/**`. The app uses `--no-src-dir`.

The rule files are copies of the kit templates plus these edits, so they aren't artifacts.

---

## Step 6: Validated rules, the contract and the schemas, then commit

The draft rules in `product-brief.md` (chapter 01) were assumptions until a human confirmed
them. Maya Chen reads them on 2026-10-19 and confirms BR-01..BR-03 and BR-10..BR-43. BR-04 (token
lifetime) stays pending: the brief leaves it open until the auth decision (HIRE-2, chapter 03). Alex moves them into
[`api/docs/context/business-rules.md`](artifacts/api/docs/context/business-rules.md), marked
with Maya as validator. Each rule has a column for the code that enforces it. Together
with the architecture doc and the API contract, these form the "Always load" set in
`api/CLAUDE.md`. The kit's Golden Triangle (`src/templates/context/golden-triangle.md`) is
business rules, architecture and workflow; here the workflow leg is the "Process" section of
the workspace `CLAUDE.md`, and the API contract is an extra file that this project always loads.

```markdown
**Validated by:** Maya Chen (product owner), 2026-10-19, from the draft in `product-brief.md`.

| ID | Rule | Enforced in | Since |
| BR-10 | Only `open` postings appear in search and detail. Draft and closed postings are never public (404 `job_not_found`). | `JobPostingRepository::searchOpen()`, `findOpenById()` | HIRE-1, fixed for detail in HIRE-9 |
```

Two more documents complete the API side:

- [`api/docs/api/api-contracts.md`](artifacts/api/docs/api/api-contracts.md): the envelope,
  the error-code table and each endpoint with its registry name. The backend is
  authoritative, so `web/types/api/*.ts` follows this file, not the other way round.
- [`api/docs/schemas/companies.md`](artifacts/api/docs/schemas/companies.md) and
  [`job-postings.md`](artifacts/api/docs/schemas/job-postings.md): columns, indexes,
  relations and the rules each table supports. The slice agent wrote them before the
  migrations (schema-first). Alex reviews them here because they are the reference every
  later spec starts from.

The Scaffold phase committed only the scaffold checkpoint. The slice, the handoff docs and the
context files are still uncommitted, which gives you a chance to review them. The workspace
root has no git, so commit in each repo with `git -C`:

```bash
cd ~/work/hireboard
git -C api status --short | head
git -C api add -A
git -C api commit -m "feat(jobs): public job search, job detail and company endpoints (HIRE-1)"
git -C api remote add origin git@github.com:hireboard/api.git && git -C api push -u origin main

git -C web add -A
git -C web commit -m "feat(jobs): job search and detail pages with server-only API client (HIRE-1)"
git -C web remote add origin git@github.com:hireboard/web.git && git -C web push -u origin main
```

`create-next-app` already ran `git init` and made an initial commit in `web/`, and the Scaffold
agent added its own commit on top. The branch name depends on your `init.defaultBranch`
setting, so check it with `git -C api branch` and `git -C web branch` before you push (the
CI files trigger on `main`). CI in both repos runs on the push.

Now check what Claude loads:

```
/memory
```

Simulated output (abridged):

```
Memory files
  User memory     ~/.claude/CLAUDE.md
  Project memory  ~/work/hireboard/CLAUDE.md
    @api/CLAUDE.md  → ~/work/hireboard/api/CLAUDE.md
      @AGENTS.md    → ~/work/hireboard/api/AGENTS.md
    @web/CLAUDE.md  → ~/work/hireboard/web/CLAUDE.md
      @AGENTS.md    → ~/work/hireboard/web/AGENTS.md
```

Both repo files must be listed. If one is missing, restart the session (imports resolve at
startup) and check the traps table in [docs/multi-repo.md](../../reference/multi-repo.md#configuration-traps).

---

## Step 7: Run it yourself

Two terminals:

```bash
cd ~/work/hireboard/api && php artisan migrate:fresh --seed && php artisan serve --port=8000
```

```bash
cd ~/work/hireboard/web && cp .env.example .env.local && npm run dev
```

Open http://localhost:3000/jobs. Tick **Remote only**, search, open a card. The full
checklist is [`api/docs/manual-test.md`](artifacts/api/docs/manual-test.md).
If you copied the final-state artifacts into a fresh scaffold, first remove the
`DemoUserSeeder` call from `DatabaseSeeder` (see the note at the end of this chapter).
`migrate:fresh` is for the local database only (AGENTS.md red lines). If the seeder complains
about a missing SQLite file, run `touch database/database.sqlite` first
([getting-started](artifacts/api/docs/getting-started.md)).

The gates, as CI runs them:

```bash
cd ~/work/hireboard/api && ./vendor/bin/pint --test && ./vendor/bin/phpstan analyse --no-progress && php artisan test
cd ~/work/hireboard/web && npm run lint && npx tsc --noEmit && npm test && npm run build
```

Expected (abridged):

```
   PASS  Tests\Feature\Companies\ShowCompanyTest
  ✓ it shows a company with its open job count
  ✓ it returns 404 company_not_found for an unknown slug
   PASS  Tests\Feature\Jobs\SearchJobPostingsTest
  ✓ it lists only open postings newest first
  ✓ it filters by keyword, location, remote, employment type and company
  ✓ it caps per_page at 50
  ✓ it returns the pagination meta
   PASS  Tests\Feature\Jobs\ShowJobPostingTest
  ✓ it shows an open posting with its company
  ✓ it returns 404 job_not_found for an unknown id
```

```
 ✓ lib/search-params.test.ts (3 tests)
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

---

## Step 8: Read the artifacts as final state

> **The artifact files show their end-of-walkthrough state, not their state on 2026-10-19.**
> Several files grow with every feature, and this chapter owns them, so they already list
> what later chapters add:
>
> - `web/lib/api/endpoints.ts` has all 18 endpoints (auth, reviews, profiles, applications).
> - `api/docs/api/api-contracts.md` documents every endpoint through HIRE-6.
> - `api/docs/context/business-rules.md` includes BR-44, which comes from the HIRE-4 clarity
>   gate in [chapter 05](05-feature-company-reviews-full-spec.md).
> - `RepositoryServiceProvider::$bindings` binds all six repositories. `CompanyRepository`
>   already has `createForOwner()` and `findByOwnerId()` for HIRE-3 and HIRE-6.
>   `DatabaseSeeder` already calls `DemoUserSeeder` (chapter 04). `Company` and `JobPosting`
>   already declare the `reviews()` and `applications()` relations.
> - `web/app/jobs/[id]/page.tsx` already links the company name to `/companies/[slug]`, which
>   HIRE-7 adds in [chapter 08](08-careers-page-s-spec-and-trivial-change.md).
> - `web/components/job-card.tsx` already formats salaries as "€60,000 – €80,000 a year", the
>   HIRE-8 change shown as a diff in [chapter 08](08-careers-page-s-spec-and-trivial-change.md).
> - `JobPostingRepository`, its interface and `JobPostingService` already contain the HIRE-9
>   fix (`findOpenById()`), shown as a diff in [chapter 09](09-bug-closed-jobs-fix-bug.md).
>   On 2026-10-19 the detail endpoint went through `findById()`, which has no status filter,
>   and none of this chapter's tests covered a closed posting. Chapter 09 is about that gap.
>
> To reproduce the slice exactly as it was on day one, leave out those additions. Remove the
> `DemoUserSeeder` call from `DatabaseSeeder` (it needs the chapter 04 role column) and any
> other forward reference, such as `$bindings` entries and the `reviews()` and `applications()`
> relations, or `migrate:fresh --seed` fails. The full artifact set only works as a whole: drop
> in every chapter's artifacts together, not a partial prefix.

Files from this chapter:

- **api, code:** `bootstrap/app.php`, `bootstrap/providers.php`, `routes/api.php`,
  `routes/api/v1/jobs.php`, `app/Http/Controllers/Controller.php`,
  `app/Http/Traits/JsonResponseTrait.php`, `app/Exceptions/{BusinessRule,JobPostingNotFound,CompanyNotFound}Exception.php`,
  `app/Providers/RepositoryServiceProvider.php`, `app/Enums/{EmploymentType,JobPostingStatus}.php`,
  `app/Models/{Company,JobPosting}.php`, `app/DTOs/{JobSearch,JobPosting,Company}DTO.php`,
  `app/Contracts/{JobPosting,Company}RepositoryInterface.php`, `app/Repositories/{JobPosting,Company}Repository.php`,
  `app/Services/{JobPosting,Company}Service.php`, `app/Http/Controllers/Jobs/{SearchJobPostings,ShowJobPosting}Controller.php`,
  `app/Http/Controllers/Companies/ShowCompanyController.php`, two migrations, two factories,
  `DatabaseSeeder`, `JobBoardSeeder`, `tests/Pest.php` and three feature tests
- **api, config and docs:** `phpstan.neon`, `.github/workflows/ci.yml`, `CLAUDE.md`, `AGENTS.md`,
  `docs/getting-started.md`, `docs/architecture.md`, `docs/manual-test.md`,
  `docs/context/business-rules.md`, `docs/api/api-contracts.md`, `docs/schemas/{companies,job-postings}.md`
- **web:** `CLAUDE.md`, `AGENTS.md`, `.env.example`, `.github/workflows/ci.yml`, `vitest.config.ts`,
  `app/{layout,page,not-found}.tsx`, `app/globals.css`, `app/jobs/{page,loading,error}.tsx`,
  `app/jobs/[id]/page.tsx`, `components/{site-header,job-card,job-filters}.tsx`,
  `lib/api/{client,endpoints,jobs}.ts`, `lib/search-params.ts` + test, `types/api/{common,jobs}.ts`

For a shorter `new app` example without split repos, see
[USAGE-EXAMPLES.md, "New app"](../../reference/usage-examples.md#5-new-app). For tier and
cost settings (`args.models`), see [docs/effort-guidelines.md](../../reference/effort-guidelines.md).

## What you have now

- Two committed repos, `api/` (Laravel 12, Sanctum, Laravel Data, Pest 3, Larastan) and `web/`
  (Next.js 15, Tailwind 4, Vitest), each with CI running exactly the kit's registry gates.
- One working vertical slice: a visitor searches open jobs by keyword, location, remote, type
  and company at `/jobs`, and opens a job detail page. Both sides have tests, and
  greenfield-build's Acceptance phase walked the journey (`SHIP-SLICE`).
- Per-repo context (`CLAUDE.md` + `AGENTS.md` + `.claude/rules/`) that `/memory` shows imported
  from the workspace root, plus the "Always load" docs in `api/docs/`: validated business rules,
  architecture and the API contract.

Next: [03 — Decision: SPA auth approach with tech-research (HIRE-2 → ADR-0001)](03-decision-spa-auth-adr.md)
