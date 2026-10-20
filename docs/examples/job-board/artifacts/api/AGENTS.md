# Hireboard API: agent instructions

Core instructions for every AI coding tool working in this repo (Claude Code, Cursor,
Codex, Copilot). Claude-specific context (routing, gotchas, `/sdd`) is in `CLAUDE.md`,
which imports this file. Each fact lives in one of the two files only.

## Stack

| Item | Value | Source of truth |
|------|-------|-----------------|
| Backend | Laravel 12, PHP 8.3, SQLite (dev and tests) | `composer.json`, `.env.example`, `phpunit.xml` |
| DTOs | Spatie Laravel Data v4 | `composer.json` |
| Auth | Sanctum personal access tokens, held by the Next.js server (ADR-0001) | `config/sanctum.php`, `docs/adr/0001-spa-auth.md` |
| Tests | Pest 3 + pest-plugin-laravel | `tests/Pest.php` |
| Static analysis | Larastan, level in `phpstan.neon` | `phpstan.neon` |
| Local env | native: `php artisan serve --port=8000` | `docs/getting-started.md` |
| Frontend | separate repo `web/` (Next.js), sibling folder in the workspace | `../web/AGENTS.md` |

## Commands

Run these exact commands. A change is done only when every gate passes. CI runs the same
three gates (`.github/workflows/ci.yml`).

```bash
./vendor/bin/pint --test                     # style (run without --test to fix)
./vendor/bin/phpstan analyse --no-progress   # static analysis
php artisan test                             # Pest, in-memory SQLite from phpunit.xml
php artisan test --filter=SearchJobPostings  # one test file or description
php artisan migrate --pretend                # read migration SQL before running it
php artisan route:list --path=api/v1         # endpoints after a route change
php artisan migrate:fresh --seed             # LOCAL dev database only
```

## Red lines

- Never run `migrate:fresh`, `db:wipe` or raw `DROP` against anything but the local SQLite file.
- Never commit `.env`, `database/database.sqlite` or real candidate data.
- Never edit a migration that has been merged to `main`. Add a new one.
- Never push to `main` directly or force-push a shared branch.
- Never weaken or delete a test to make it pass.
- Never expose a draft or closed posting publicly, or a candidate's identity in a public
  review (BR-10, BR-42).
- Never return an Eloquent model from a repository or a service, or accept a raw `Request`
  or `array` in a service.

## Architecture

```
routes/api/v1/<area>.php -> Invokable Controller -> Service (DTOs) -> Repository (interface) -> Model
```

- **Schema first:** update `docs/schemas/<table>.md` before writing a migration.
- **DTO first:** `App\DTOs`, Spatie Laravel Data, camelCase `readonly` properties.
  Input DTOs carry class-level `#[MapInputName(SnakeCaseMapper::class)]` and are built with
  `validateAndCreate()`. Output DTOs are built with `fromModel()` and serialized with
  `toApiArray()`, so they need no input mapping.
- **Invokable controllers:** `App\Http\Controllers\<Area>\<Verb><Entity>Controller`, `final`,
  one `__invoke()`. Authorize (`$this->authorize()` with an auto-discovered Policy), build the
  DTO, call one service method, respond with `resource()`, `paginated()` or `noContent()`
  from `JsonResponseTrait`.
- **Services** (`App\Services`) own business rules and transactions. **Repositories**
  (`App\Repositories`) own queries, implement `App\Contracts\<Name>RepositoryInterface`, and
  are bound in `RepositoryServiceProvider::$bindings`. They return DTOs or paginators of DTOs.
- **Errors:** throw a subclass of `App\Exceptions\BusinessRuleException` (`status()`,
  `errorCode()`). `bootstrap/app.php` renders it, plus validation, auth, 403, 404 and 429
  errors, in the INV-01 error envelope. Controllers never catch exceptions.
- **Routes:** each feature adds its own `routes/api/v1/<area>.php`; `routes/api.php` loads
  them under `/api/v1`. Route parameters are plain strings (`{id}`, `{slug}`) resolved by
  services, no implicit model binding. Normalize query booleans with `$request->boolean()`.
- The API contract in `docs/api/api-contracts.md` is authoritative for request and response
  shapes. Business rules are in `docs/context/business-rules.md`.

## Code standards

- Code should read like a senior developer wrote it. No history markers like `(NEW)`,
  `(FIXED)` or `// updated per review`, and no comments that restate the code.
- Comments explain why: business rules (cite the BR id), non-obvious constraints,
  security-sensitive steps.
- Write the failing Pest test first, then the code. Feature tests live in
  `tests/Feature/<Area>/` and use factories with states.
- Documentation filenames are lowercase. Only `README.md`, `CLAUDE.md` and `AGENTS.md` are uppercase.

## Git

- Branches: `<feature|fix|chore>/HIRE-<n>-<slug>`. Cross-repo work uses the same branch name
  in `web/`. This repo merges first when a change is additive.
- Commits: Conventional Commits (`feat(reviews): ...`). One logical change per commit.
- If a doc conflicts with the code, trust the code and fix the doc in the same change.
