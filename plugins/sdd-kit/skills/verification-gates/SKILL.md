---
name: verification-gates
description: Standard post-implementation quality gates for Laravel and Next.js (formatter, static analysis, debug-call scan, tests, coverage, ESLint, type-check, production build, browser journeys, accessibility) and how to report them. Use after implementing any change, before declaring it done; "tool unreachable" is never a pass.
user-invocable: false
---

# Verification Gates

Standard quality checks to run after implementation. Apply them from any skill or workflow that changes code; the `code-quality` agent runs them as one verification step. The lists match the workflows' stack registry (generated from `stack.json`, in `workflows/lib/stacks.js`: `.claude/workflows/lib/stacks.js` in a file-copy install, `src/workflows/lib/stacks.js` in the plugin), so a gate that runs in a workflow runs here too. Other skills (`fix-ci`, `open-pr`, `run-tests`, `nextjs-testing`) point here for the gate set and the package-manager rule instead of keeping their own copies.

Run each repo's gates in that repo (in a polyrepo project, the backend gates in the Laravel repo and the frontend gates in the Next.js repo). Use only tools that are installed, but a tool that should run and cannot is reported as unreachable, never skipped silently.

## Laravel gates

```bash
# 1. Code style
./vendor/bin/pint --test

# 2. Static analysis
./vendor/bin/phpstan analyse --no-progress

# 3. No debug statements (changed files, outside tests)
grep -rnE "\b(dd|dump|ray)\(" app/ --include="*.php"

# 4. Tests pass (scoped while iterating, full suite before PASS)
php artisan test --filter={FeatureName}
php artisan test

# 5. Coverage threshold (when touching business logic)
php artisan test --coverage --min=80
```

## Package manager

`<pm>` runs a package script, `<pmx>` runs a local binary. Both come from the lockfile in the repo root, the same rule the workflows' Detect phase uses:

| Lockfile | `<pm>` | `<pmx>` |
|----------|--------|---------|
| `pnpm-lock.yaml` | `pnpm` | `pnpm exec` |
| `yarn.lock` | `yarn` | `yarn` |
| `bun.lockb` or `bun.lock` | `bun` | `bunx` |
| `package-lock.json`, or no lockfile | `npm` | `npx` |

More than one lockfile is itself a finding: ask which one is canonical instead of picking or deleting one. Never hardcode npm or npx in a repo with another lockfile.

## Next.js gates

```bash
# 6. Lint
<pm> run lint

# 7. Type safety
<pmx> tsc --noEmit

# 8. Production build (catches server/client boundary errors, missing env, bad imports that tsc misses)
<pmx> next build

# 9. No debug statements (changed files, outside tests)
grep -rnE "console\.log\(|\bdebugger\b" app/ src/ components/ lib/ 2>/dev/null

# 10. Unit and component tests (when Vitest is installed; otherwise <pm> test)
<pmx> vitest run
<pmx> vitest run --coverage        # when touching business logic in the frontend

# 11. Browser journeys (when playwright.config.* exists and the change touches a journey)
<pmx> playwright test

# 12. Accessibility (when touching UI components)
#   component level: an axe assertion in the Vitest test
#   page level: <pmx> lighthouse <url> --only-categories=accessibility  (budget >= 95), or axe in Playwright
```

## Cross-repo gate

```bash
# 13. Contract sync (backend and frontend in separate repos, when installed)
node scripts/contract-sync.mjs        # or the project's "contract-sync" script
```

## Gate Results Format

```
Verification Gates: api (laravel)
  [PASS] 1. Code Style (Pint)
  [PASS] 2. Static Analysis (PHPStan)
  [PASS] 3. No Debug Statements
  [PASS] 4. Tests Passing (214/214)
  [SKIP] 5. Coverage            reason: no business logic changed

Verification Gates: web (nextjs)
  [PASS] 6. Lint (ESLint)
  [PASS] 7. Type Safety (tsc)
  [FAIL] 8. Production Build (next build)   app/jobs/page.tsx: useState in a Server Component
  [PASS] 9. No Debug Statements
  [PASS] 10. Tests (Vitest 88/88)
  [SKIP] 11. Browser Journeys   reason: no journey touched
  [SKIP] 12. Accessibility      reason: no UI component changed

  [PASS] 13. Contract Sync
```

Conditional gates (coverage, browser journeys, accessibility, contract sync) are skipped only with the reason logged; never silently omitted. Gates 1-4 and 6-10 always apply to a repo whose code changed.

## On Failure

- Fix the issue immediately before proceeding
- Re-run only the failed gate after fixing, then the full set once before declaring done
- Never weaken a gate to pass it: no lowered PHPStan level, new baseline entries, `@phpstan-ignore`, `eslint-disable`, `@ts-expect-error`, skipped tests, or lowered coverage thresholds
- Do not skip gates unless the user explicitly requests `--skip-verify`
