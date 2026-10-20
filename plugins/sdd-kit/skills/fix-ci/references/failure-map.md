# Failure Map — Laravel 12 + Next.js 15

Root causes seen most often per gate, with the honest fix. Load from `/fix-ci` Step 2 once the failing step is classified. Every "Do not" here is on the protected list in SKILL.md and needs explicit user confirmation.

## Cross-cutting: "passes locally, fails in CI"

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Module not found: Can't resolve '@/components/Button'` only in CI | macOS file systems are case-insensitive by default, Linux runners are not. The import casing differs from the filename | Make the import match the file. For a filename-only case change use `git mv -f button.tsx Button.tsx` so git records it |
| `Class "App\Data\UserDto" not found` only in CI | PSR-4 class name and filename casing differ (`UserDTO.php` vs `UserDto`) | Rename the file or class so they match exactly, then `composer dump-autoload` |
| Different results on the same command | PHP or Node major differs between CI and local | Align local with CI (`.nvmrc`, `php-version`) before fixing. If CI is the outdated side, change CI through devops-engineer |
| Works after `rm -rf node_modules` / `vendor` | Stale local install hid the failure | Reproduce from a clean install: `<pm> ci`-equivalent, `composer install` |
| Fails only on the first run of a new cache key | Cache restored a dependency tree that no longer matches the lockfile | Fix the cache key to hash the lockfile (devops-engineer) |

## Pint

- Unformatted files after a merge or a hand edit → `./vendor/bin/pint <files>`. Commit formatting separately from logic when the diff is large.
- CI and local disagree → different Pint versions or a missing `pint.json` preset. Pin Pint in `composer.json` `require-dev` and use the project's `pint.json`.
- Do not: add `exclude` paths or disable rules to get green.

## PHPStan / Larastan

| Error | Usual cause | Fix |
|-------|-------------|-----|
| `Access to an undefined property App\Models\X::$foo` | Missing `@property` PHPDoc or Larastan not loaded | Add the model PHPDoc or include `larastan/larastan` in `phpstan.neon` |
| `... return type has no value type specified in iterable type array` | Untyped arrays at a higher level | Add generics (`@return array<int, OrderData>`, `Collection<int, Order>`) |
| `Parameter #1 ... expects X, X\|null given` | A nullable value reaches a non-null parameter | Handle the null case at the boundary (guard, `firstOrFail()`, DTO validation) |
| Out of memory | Default memory limit too low in CI | Keep the CI flag (`--memory-limit=1G`) when reproducing. Raising the limit in CI is not a weakening |
| New errors after `composer update` | Stricter stubs in a Larastan or PHPStan release | Fix the code. If the release is the problem, pin the previous version and say why |

Do not: run `--generate-baseline`, add `@phpstan-ignore`, add `ignoreErrors`, or lower `level`.

## Pest

| Symptom | Cause | Fix |
|---------|-------|-----|
| `No application encryption key has been specified` | CI has no APP_KEY | Set `APP_KEY` in `phpunit.xml` `<env>` or `.env.testing`, or run `php artisan key:generate --env=testing` in the CI setup step |
| `could not find driver` / `SQLSTATE[HY000] [2002]` | Missing PDO extension or DB service not ready | Add the extension or a service health check in the workflow (devops-engineer) |
| Passes on SQLite, fails on MySQL/Postgres in CI | Engine differences: JSON columns, strict mode, case-sensitive `LIKE`, FK enforcement | Make the query or migration engine-correct; prefer running tests on the production engine |
| Fails only with `--parallel` | Shared state: fixed IDs, files on disk, static caches, the same Redis DB | Use factories, `Storage::fake()`, per-process tokens (`ParallelTesting::token()`) |
| Fails around midnight, month-end, or in another TZ | Real clock in a test | Freeze time with `$this->travelTo()` or `Carbon::setTestNow()` |
| Assertion on product behavior, code changed on this branch | Real defect | Hand off to `/sdd` bug |

Coverage below `--min`: add tests for the uncovered lines the change introduced (`pest-3` skill). Do not lower `--min` or add coverage excludes.

## ESLint

- ESLint 9 uses flat config (`eslint.config.mjs`). A legacy `.eslintrc*` alongside it, or a plugin without flat-config support, produces config errors rather than lint errors. Fix the config so it loads; do not drop the plugin's rules.
- Next.js 15.5 deprecates `next lint`. When the `lint` script still calls it and the warning breaks a `--max-warnings=0` run, move the script to the ESLint CLI with the same config (`eslint .`) instead of loosening the warning budget.
- `react-hooks/exhaustive-deps` and `@typescript-eslint/no-unused-vars` findings are usually real. Fix the dependency list or remove the dead code.
- Do not: add `eslint-disable*` comments, turn rules off, or downgrade them to `warn`.

## TypeScript (tsc) and `next build`

| Error | Cause | Fix |
|-------|-------|-----|
| `Type '{ params: { id: string } }' does not satisfy the constraint 'PageProps'` | In Next.js 15, `params` and `searchParams` are Promises | Type them as `Promise<{ id: string }>` and `await params` in the Server Component. In Client Components use `React.use(params)` |
| `cookies()` / `headers()` used synchronously | Both are async in Next.js 15 | `const cookieStore = await cookies()` |
| `useSearchParams() should be wrapped in a suspense boundary at page "/x"` | A Client Component reads search params during static prerender | Wrap that component in `<Suspense fallback={…}>` |
| `Error occurred prerendering page "/x"` from a `fetch` | The build tries to call the API, which CI does not run | Make the route dynamic (`export const dynamic = 'force-dynamic'`) or fetch at request time. Do not point builds at production |
| `You're importing a component that needs "server-only"` / hooks in a Server Component | Server/client boundary crossed | Move the hook usage into a `'use client'` leaf, or keep server-only code out of client imports (`nextjs-15` skill, `references/server-components.md`) |
| Build-time `undefined` for `NEXT_PUBLIC_*` | Public env vars are inlined at build time and CI does not set them | Add the variable to the build job's `env:` (devops-engineer). Never commit real values |
| Type errors only in CI | `tsconfig` `include` misses generated `.next/types` locally, or a stale `next-env.d.ts` | Run `<pm> run build` locally, which regenerates route types, and fix what it reports |

Do not: set `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds`, add `@ts-ignore` / `@ts-expect-error`, cast through `any`, or relax `strict`.

## Vitest

Test-writing and config patterns for this layer: `nextjs-testing` skill.

- `ReferenceError: document is not defined` → the test needs `environment: 'jsdom'` (or `happy-dom`) in `vitest.config.*` or a per-file `// @vitest-environment jsdom` directive.
- Snapshot mismatch → decide whether the UI change is intended. Intended → update with `vitest run -u` for that file only and say so in the report. Unintended → it is a regression; hand off to `/sdd` bug.
- Fake-timer leaks between tests → restore with `vi.useRealTimers()` in `afterEach`.

## Playwright

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Executable doesn't exist at …/chromium-…` | Browsers not installed in CI | `<pmx> playwright install --with-deps chromium` in the workflow (devops-engineer; `<pmx>` per the `verification-gates` package-manager rule) |
| `Timed out waiting … from config.webServer` | App fails to start or is slow to build | Run the `webServer.command` locally and fix the startup error; raise the timeout only when the start is healthy but slow |
| Locator not found after a UI change | Selector bound to markup instead of role or text | Use `getByRole` / `getByLabel` / `getByTestId` |
| Passes on retry | Race in the test (no web-first assertion, fixed `waitForTimeout`) | Use `await expect(locator).toBeVisible()` style assertions; remove sleeps |

Do not: raise `retries`, add `test.skip` / `test.fixme`, or delete the spec.

## Install and lockfiles

| Error | Fix |
|-------|-----|
| `npm ci` — `package.json and package-lock.json … are not in sync` | `npm install` with CI's Node major, then commit the lockfile |
| `ERR_PNPM_OUTDATED_LOCKFILE` | `pnpm install` locally (no `--frozen-lockfile`), commit `pnpm-lock.yaml` |
| `yarn install --immutable` — lockfile would be modified | `yarn install`, commit `yarn.lock` |
| `ERESOLVE unable to resolve dependency tree` | Usually a library whose `peerDependencies` predate React 19 / Next.js 15. Upgrade that library to a version that supports them, or replace it. `--legacy-peer-deps`, `--force`, and `overrides` are protected |
| Composer: `The lock file is not up to date with the latest changes in composer.json` | `composer update <changed/package> --with-dependencies`, commit `composer.lock` |
| Composer: `Your lock file does not contain a compatible set of packages` | Lock was resolved for a different PHP. Set `config.platform.php` to the production PHP version and re-resolve, or align the CI PHP version |
| Two lockfiles (`package-lock.json` and `pnpm-lock.yaml`) | Ask which manager is canonical, then remove the other and set `packageManager` in package.json |

## Contract sync

A job that regenerates the API contract (an OpenAPI document from the Laravel API, or TypeScript types generated from it) and fails on `git diff --exit-code` means the committed contract is stale.

1. Run the same generate command the step runs (read the workflow; it is usually a composer or package script).
2. Inspect the diff. Additive or descriptive changes → commit the regenerated files.
3. A removed field, renamed property, or changed type that the Next.js app consumes is a breaking API change. Fix the consumer in the same change if the spec intended it; otherwise it is a backend regression → `/sdd` bug.

Do not hand-edit generated files to match.

## Audit

- `composer audit` / `npm audit --audit-level=high` failing on a new advisory → bump to the patched version within the existing constraint (`composer update vendor/package`, `npm update package`).
- The patch needs a major upgrade → stop and recommend `/upgrade-deps`; run `/security-scan` if the advisory touches auth or data handling.
- Do not add the advisory to an ignore list unless the user confirms that the vulnerable path is unreachable, and record why.

## CI config and Docker (devops-engineer)

| Symptom | Typical fix |
|---------|-------------|
| `Invalid workflow file` | YAML or expression error; validate with `actionlint` |
| Deprecated action version (artifact or cache actions) | Bump to the supported major |
| Service container never healthy | Add a `--health-cmd` with retries, and wait for it before migrations |
| `docker build` stage fails | Reproduce with `docker build --target <stage> .`; match the base image's PHP/Node version to the project |
| Job needs a secret that forks cannot read | Gate the step on the event, not by deleting it; document the secret |

The agent must not remove steps, add `continue-on-error`, use `if: false`, append `|| true`, or narrow triggers. Review its diff against the protected list before accepting.
