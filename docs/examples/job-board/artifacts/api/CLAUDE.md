# Hireboard API

@AGENTS.md

## Project facts

The Laravel 12 JSON API behind Hireboard, a small job board. Visitors search open postings
and read careers pages; candidates keep a profile, apply and review companies; employers see
applications to their jobs; admins moderate reviews. What must never break: closed or draft
postings must never be public, and a public review must never reveal its author.

The stack, exact commands, red lines, architecture and code standards are in `AGENTS.md`
(imported above). Cross-repo rules (contract, routing, process) are in the workspace
`../CLAUDE.md`. Each fact goes in one file only.

## Always load

Read these before non-trivial work.

1. `docs/context/business-rules.md`: BR-01..BR-44, validated by Maya Chen
2. `docs/architecture.md`: layers, decisions A1-A10, request flow
3. `docs/api/api-contracts.md`: request and response shapes the web app relies on

## Task routing

| If you are working on | Load first |
|-----------------------|------------|
| API endpoint | `docs/api/api-contracts.md`, the area's DTOs in `app/DTOs/`, `.claude/rules/api-controllers.md` |
| Database schema | `docs/schemas/<table>.md`, then `.claude/rules/migrations.md` |
| Service or repository | `.claude/rules/services-dtos.md`, the interface in `app/Contracts/` |
| Auth, tokens, roles | `docs/adr/0001-spa-auth.md`, `app/Services/AuthService.php`, the area's Policy |
| Error responses | `bootstrap/app.php`, `app/Exceptions/BusinessRuleException.php`, "Error codes" in the contract |
| Tests | `.claude/rules/tests.md`, `tests/Pest.php`, the factories' states |
| Demo data | `database/seeders/JobBoardSeeder.php`, `DemoUserSeeder.php` |

## Invariants

Rules that hold everywhere. Cite them by ID in specs and reviews. INV-05 and INV-06 are
enforced in `web/`; they are listed here because an API change can break them.

- **INV-01** API under `/api/v1`. Success envelope `{success, status, message, data[, meta]}`;
  paginated `meta` is `{current_page, per_page, total, last_page}`. Error envelope
  `{success: false, status, message, code[, errors]}`. Build responses only through `JsonResponseTrait`.
- **INV-02** Single-action invokable controllers, business logic in services, DTOs across
  layers, repositories behind `App\Contracts` interfaces.
- **INV-03** Domain tables use UUID keys (`HasUuids`); `users` keeps bigint ids so Sanctum's
  token morphs work unchanged.
- **INV-04** Timestamps are stored in UTC and serialized as ISO-8601.
- **INV-05** The browser never holds the API token; the Next.js server keeps it in the
  HttpOnly cookie `hireboard_session` (ADR-0001). The API needs no CORS config.
- **INV-06** Every endpoint the browser calls is listed in `../web/lib/api/endpoints.ts` and
  `docs/api/api-contracts.md`. Adding or changing a route means updating both.
- **INV-07** Salaries are integers (annual, whole currency units) plus an ISO-4217 currency.

## Gotchas

- **GOTCHA-01** Tests use SQLite `:memory:` from `phpunit.xml`, not `.env`. A test that
  passes locally against `database/database.sqlite` was not run through `php artisan test`.
  SQLite `LIKE` is case-insensitive for ASCII only, so don't rely on it for other text.
- **GOTCHA-02** `JobPostingRepositoryInterface::findById()` ignores status on purpose
  (applications must tell "unknown" from "closed"). Public reads use `findOpenById()`.
  `FIXED by HIRE-9`: the detail endpoint used `findById()` and showed closed postings.
- **GOTCHA-03** Query-string booleans arrive as strings; `remote=false` is a truthy string and
  fails the `boolean` rule. Normalize with `$request->boolean()` (accepts 1/0/true/false/on/off/yes/no)
  before building the DTO.
- **GOTCHA-04** Laravel converts `AuthorizationException` to `AccessDeniedHttpException`
  before render callbacks run, so `bootstrap/app.php` renders the latter as 403 `forbidden`.

## Change-impact map

| If you change | Also update |
|---------------|-------------|
| A DTO's `toApiArray()` | `docs/api/api-contracts.md`, `../web/types/api/*.ts`, feature tests asserting the shape |
| A database column | `docs/schemas/<table>.md`, migration, factory, DTO, seeder |
| A route | `routes/api/v1/<area>.php`, contract doc, `../web/lib/api/endpoints.ts` |
| An enum | `app/Enums/`, the web literal union, factories, seeders, validation |
| An error code | the exception class, the contract's error table, the web form that maps it |
| A business rule | ask Maya Chen, then `docs/context/business-rules.md` and the specs citing it |

## Environment drift

- Local and CI use SQLite. Production database is not chosen yet (architecture A9). Avoid
  SQLite-only behavior in queries.
- PHP 8.3 locally and in CI (`.github/workflows/ci.yml`).

## Trust hierarchy

When sources disagree, trust them in this order and fix whatever is lower:

1. Running code and passing tests
2. Migrations and `docs/schemas/`
3. `docs/api/api-contracts.md`
4. This file, rules and other docs
5. Comments, commit messages, memory

Never state counts or versions of moving things as facts in docs. Point to the file that
defines them (`php artisan route:list`, `composer.json`).

## How to start work

- Feature, bug or decision: `/sdd <HIRE-n: description>` (`/sdd-kit:sdd` in plugin mode).
  No tracker is connected, so paste the ticket text.
- Specs live in `.ai/specs/spec-HIRE-<n>-<slug>/`. Resume one with `/sdd <spec id>`.
- Small, obvious change: just do it, then run the three gates.
- Write a failing test before the fix or the feature.

## Review settings

```yaml
deep-review:
  phpstan-level: 5
```

`/deep-review` runs PHPStan at level 9 unless this block lowers it. Hireboard's `phpstan.neon`
is level 5, so the review matches the project gate.

## Area rules

Path-scoped conventions in `.claude/rules/` load when matching files are read:

| Rule file | Applies to |
|-----------|-----------|
| `tests.md` | `tests/**` |
| `migrations.md` | `database/migrations/**`, `docs/schemas/**` |
| `api-controllers.md` | `app/Http/Controllers/**`, `app/Http/Requests/**`, `app/Http/Resources/**`, `routes/api.php`, `routes/api/**` |
| `services-dtos.md` | `app/Services/**`, `app/DTOs/**`, `app/Repositories/**`, `app/Events/**` |
