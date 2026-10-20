---
name: run-tests
description: Run the Pest, Vitest and Playwright suites of a Laravel + Next.js project - Pest with filtering by name, module, or unit/feature type, coverage thresholds and parallel runs; --frontend for Vitest with coverage; --e2e for Playwright journeys in an isolated e2e environment that playwright.config (webServer) and e2e/db.setup.ts start and seed. Polyrepo-aware, analyzes failures, and ends with a per-repo verdict. Use when you need to verify a change, investigate failing tests, check coverage, or confirm the suites are green before a merge or release.
argument-hint: "[filter] | --module=[name] | --unit | --feature | --coverage | --all | --frontend | --e2e [\"AC-n:\"] [--url=<e2e frontend url>]"
allowed-tools: Bash, Read, Grep, Glob
metadata:
  version: 1.2
  last_verified: "2026-10-19"
  next_review: "2027-01-19"
---

# /run-tests

Run the test suites, analyze failures, and report a verdict per repo.

## Usage

```bash
# Backend (Pest)
/run-tests --all
/run-tests --module=User
/run-tests UserRegistration
/run-tests --coverage
/run-tests --unit
/run-tests --feature

# Frontend unit and component tests (Vitest, with coverage)
/run-tests --frontend

# Browser journeys (Playwright) in the isolated e2e environment
/run-tests --e2e
/run-tests --e2e "AC-3:"                     # one acceptance criterion
/run-tests --e2e --url=http://127.0.0.1:3100 # reuse an already-running e2e frontend

# Everything, every repo
/run-tests --all --frontend --e2e
```

## Finding the repos

Single repo: run from its root. Polyrepo: find the backend (has `artisan`) and the frontend (`next` in `package.json`) the way the workflows do, from `repos: { backend, frontend }` paths, sibling folders such as `api/` and `web/`, or a parent workspace. Run each suite in its own repo directory and label the results by repo.

For the frontend, `<pm>` and `<pmx>` follow the `verification-gates` package-manager rule (lockfile → `npx`, `pnpm exec`, `yarn`, or `bunx`).

## Backend: Pest

### Basic Execution
```bash
php artisan test                                        # all tests
php artisan test --filter=UserRegistration              # by name
php artisan test tests/Feature/UserRegistrationTest.php # one file
php artisan test app/Modules/User/Tests/                # one module (modular projects)
php artisan test --testsuite=Unit                       # unit only
php artisan test --testsuite=Feature                    # feature only
```

### Coverage
```bash
php artisan test --coverage
php artisan test --coverage --min=80
./vendor/bin/pest --coverage --coverage-html=coverage
```

### Parallel
```bash
php artisan test --parallel
php artisan test --parallel --processes=4
```

If the project runs in DDEV (`.ddev/` exists and `ddev describe` succeeds), prefix the commands with `ddev exec`.

## Frontend: Vitest (`--frontend`)

```bash
<pmx> vitest run                       # all unit and component tests
<pmx> vitest run --coverage            # with coverage (v8 or istanbul, as configured)
<pmx> vitest run src/components/JobCard.test.tsx
```

If Vitest is not installed but `package.json` has a `test` script, run that and say so. Test patterns (React Testing Library, MSW mocks built from the Laravel contract, Server Action tests) are in the `nextjs-testing` skill.

## Browser journeys: Playwright (`--e2e`)

E2E runs in its own environment, never against the dev database or the Pest `testing` database (a `RefreshDatabase` run and `migrate:fresh` would wipe each other's data). The `nextjs-testing` skill's `references/playwright-e2e.md` is the one convention: `playwright.config.ts` `webServer` starts Laravel with `APP_ENV=e2e` (its own `.env.e2e` and database) and the Next.js app pointed at it, and the `db` setup project (`e2e/db.setup.ts`) wipes and seeds that database with `E2ESeeder`. This skill only runs Playwright:

1. **Check the setup.** In the frontend repo, `playwright.config.*` exists and has a `db` setup project and `webServer` entries. Missing → report it and point to `references/playwright-e2e.md`; do not run `migrate:fresh` or start servers by hand to compensate.
2. **Run**:
   ```bash
   <pmx> playwright test                         # all journeys
   <pmx> playwright test e2e/job-posting.spec.ts # one journey
   <pmx> playwright test --grep "AC-3:"          # one acceptance criterion (the colon keeps AC-3 from matching AC-30)
   ```
   With `--url`, the config's `reuseExistingServer` picks up an e2e frontend already running there (local runs only).
3. On failure, read the trace and screenshot paths Playwright prints (`test-results/`), and report the step that failed.

## Test Priority Matrix

| Priority | Coverage | Areas |
|----------|----------|-------|
| Critical | 100% | Authentication and authorization, money movement, data integrity, Server Actions that change data |
| High | 90%+ | Business logic services, API endpoints, repositories |
| Medium | 80%+ | Model relationships, events and listeners, middleware, interactive components |
| Low | 70%+ | Simple operations, accessors, resources, presentational components |

## Failure Analysis

Classify each failure and suggest a fix tied to the file:

| Severity | Examples |
|----------|----------|
| CRITICAL | Database connection, authentication, payment processing |
| HIGH | Business logic, validation, API contract violations (backend response vs frontend type) |
| MEDIUM | Edge cases, timeouts, race conditions, flaky E2E waits |
| LOW | Formatting, minor assertion differences |

Common fixes: test database out of date (`php artisan migrate:fresh --env=testing`), missing role or permission seeding, stale cache (`php artisan cache:clear --env=testing`), an MSW handler that no longer matches the contract, an E2E selector that relies on text instead of a role or label.

Re-run a failing test up to three times before calling it flaky; flaky tests are reported, never ignored.

## Output Format

```
Test Report

api (laravel)   Pest        212/214 passed   coverage 87.3% (min 80)   45.2s
web (nextjs)    Vitest       88/88  passed   coverage 81.0%            6.1s
web (nextjs)    Playwright    5/6   passed   e2e env (http://127.0.0.1:3100)

Failed:
1. api  tests/Feature/OrderTest.php > it creates an order
   Expected 201, got 422 (CreateOrderData requires shipping_address_id)
   Fix: send shipping_address_id in the test, or make it optional in app/DTOs/CreateOrderData.php:18
2. web  e2e/checkout.spec.ts > AC-3 pays with a saved card
   Step "click Pay" timed out; trace: test-results/checkout-AC-3/trace.zip

Verdict
  api  FAIL (2 failing)
  web  FAIL (1 failing journey)
Overall: FAIL
```

A suite that could not run (tool missing, server down) is reported as NOT RUN with the reason, never as passed.

**Source Verification**: Follow the `source-verification` skill.
