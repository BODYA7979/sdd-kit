# Guard ladder: patterns per rung

Load this when drafting the guard in `/learn` Step 3. Each rung shows where the guard goes, a Laravel 12 / Next.js 15 example, and what makes it a bad fit. Match the target project's existing files and style over these examples.

## Rung 1: regression or architecture test

### Pest `arch()` (structural rules in PHP)

Append to the project's existing arch file (Grep `arch(` under `tests/`). If there is none, create `tests/Unit/ArchTest.php`: the Unit suite runs by default, while a new `tests/Arch/` folder is skipped unless `phpunit.xml` declares it as a test suite.

```php
arch('controllers do not query')
    ->expect('Illuminate\Support\Facades\DB')
    ->not->toBeUsedIn('App\Http\Controllers');

arch('no debugging statements')
    ->expect(['dd', 'dump', 'ray', 'var_dump'])
    ->not->toBeUsed();

arch('services are final')
    ->expect('App\Services')
    ->toBeFinal();

arch('domain stays framework-free')
    ->expect('App\Domain')
    ->not->toUse('Illuminate\Support\Facades')
    ->ignoring('App\Domain\Legacy');   // only with approval, listing the known violations
```

- Name the test after the rule, not the incident: `controllers do not query`, not `fix export bug`.
- `ignoring()` keeps the guard green while known violations are fixed. List each ignored path in the diff so the user approves it explicitly.
- More expectations (`toOnlyDependOn`, `toHaveMethod`, `toExtend`, `toUseStrictTypes`): `pest-3/references/advanced-testing.md`.

### Pest feature or unit test (behavior rules)

Use when the class is a behavior, not a structure: "every money endpoint returns minor units", "a refund never exceeds the captured amount". Guard the rule across inputs with a dataset rather than re-asserting the one fixed case.

```php
use Laravel\Passport\Passport;

it('returns money as integer minor units', function (string $routeName) {
    $order = Order::factory()->create();
    Passport::actingAs($order->user, [], 'api');

    $this->getJson(route($routeName, $order))
        ->assertOk()
        ->assertJsonPath('data.total', fn ($total) => is_int($total));
})->with(['orders.show', 'orders.receipt']);
```

Place it where the project keeps tests for that area (`tests/Feature/<Module>/`). Use factories, not seeded data.

### Vitest (frontend behavior)

Vitest has no architecture API, so structural frontend rules go to rung 2 (ESLint). Use Vitest for behavior: formatters, mappers, hooks, Server Actions logic. Colocate as `*.test.ts(x)`, matching the project's existing tests (use Jest if that is what the project runs).

```ts
import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

describe('formatMoney', () => {
  it.each([
    [0, '$0.00'],
    [199, '$1.99'],
    [100000, '$1,000.00'],
  ])('formats %i minor units as %s', (minor, expected) => {
    expect(formatMoney(minor, 'USD')).toBe(expected);
  });
});
```

**Bad fit for rung 1:** the rule needs judgment ("names should be clear"), or a test would have to parse source text with regexes. Move down the list to rung 2 or 3.

## Rung 2: static analysis rule

Only configure tools the project already runs in its gates. Never add a dependency to enable a guard.

### PHPStan / Larastan (`phpstan.neon` or `phpstan.neon.dist`)

Options in order of cost:

1. Raise `level` one step for a path that keeps producing the class (via a separate config or `paths:`), if the rest stays green.
2. Turn on a parameter the installed extension already offers, for example Larastan's `checkModelProperties: true` when the mistake was a typo'd model attribute.
3. A custom rule class implementing `PHPStan\Rules\Rule`. This is real code to maintain, so propose it only when an `arch()` test cannot express the class.

Never use `ignoreErrors` or the baseline to make a new guard green.

```neon
parameters:
    level: 8
    checkModelProperties: true
```

### ESLint flat config (`eslint.config.mjs`)

Next.js 15 projects export an array of config objects. Append one scoped object; do not edit the shared `next/core-web-vitals` entries.

```js
{
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/lib/api/**'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{ name: 'axios', message: 'Call the backend through the typed client in src/lib/api.' }],
    }],
    'no-restricted-syntax': ['error', {
      selector: "CallExpression[callee.name='parseFloat']",
      message: 'Money is integer minor units end to end. Use formatMoney() for display.',
    }],
  },
},
```

- The `message` is the guard's documentation: say what to do instead, not only what is forbidden.
- Scope with `files` / `ignores` so the rule fires only where the class applies.

**Bad fit for rung 2:** the analyzer cannot see the pattern without a new plugin, or the rule would flag legitimate code in more places than it catches mistakes.

## Rung 3: path-scoped rules line

Pick the `.claude/rules/<file>.md` whose `paths:` globs cover the evidence file (kit defaults: `api-controllers.md`, `services-dtos.md`, `migrations.md`, `frontend-pages.md`, `tests.md`). Add one imperative bullet to the section it belongs to, with the reason in the same line.

```diff
 ## Talking to the backend

 - All backend calls go through the typed API client in `src/lib/api/`. No ad-hoc `fetch('/api/...')` in components.
+- Server Actions re-validate input with the same schema as the API; never trust the form's client-side check.
```

- If no rules file covers the path, use rung 4. Propose a new rules file only when there are already two or more lessons for the same paths.
- If the new line contradicts an existing one, show both and ask which wins; never leave both.

**Bad fit for rung 3:** the rule applies across the whole codebase (rung 4), or a tool could enforce it (rungs 1-2).

## Rung 4: CLAUDE.md INV or GOTCHA entry

Choose the type:

| Entry | Use for | Shape |
|-------|---------|-------|
| `INV-NN` | A rule that must hold everywhere; specs and reviews cite it | `- **INV-NN** <Rule>. <Consequence of breaking it.>` |
| `GOTCHA-NN` | A confirmed trap that looks right but is not | `- **GOTCHA-NN** <Symptom>, because <cause>. <Correct approach>. (seen: <file:line or ticket>)` |

```diff
 ## Gotchas
 ...
 - **GOTCHA-03** Frontend enum literals type-check but must match backend values exactly.
+- **GOTCHA-04** Queued listeners see stale model data, because the job serializes the model before the transaction commits. Dispatch with `afterCommit()`. (seen: app/Listeners/SendRefundEmail.php:22)
```

- Number = highest existing number + 1, two digits. Never reuse a number, even from a removed entry.
- Keep fixed entries and annotate them (`FIXED by spec-0051`, `guarded by tests/Unit/ArchTest.php`), as the CLAUDE.md template asks.
- If the section does not exist, add it with the template heading (`## Invariants` / `## Gotchas`) and its one-line intro, after `## Task routing` when present.
- One or two lines per entry. CLAUDE.md is loaded every session; a long entry is a recurring cost.

**Bad fit for rung 4:** the lesson is specific to a few files (rung 3) or enforceable by a tool (rungs 1-2).

## Rung 5: hook (proposal only)

Hooks change what Claude Code executes, so they need the owner's approval and are never written by `/learn`. Use this rung only when the mistake is an action no test or rule sees in time: editing a generated file, running a destructive command, ending a session without a required step.

Print the proposal in this shape:

```
Hook proposal (not applied: needs the owner's approval)
Event:     PreToolUse
Matcher:   Edit|Write
Check:     block edits to _ide_helper*.php and *.generated.ts (regenerated by tooling)
Behavior:  exit 2 with "Generated file: run `php artisan ide-helper:generate` instead" (blocks the call, reason goes to Claude)
Goes in:   the project's .claude/settings.json "hooks" (both modes; the kit's own hooks/hooks.json is never edited for a project rule)
Script:    .claude/scripts/block-generated.sh, sketched below
Why not rungs 1-4: the mistake happens at edit time; a test only fails after the damage
```

Follow it with a short script sketch reading the hook JSON from stdin (`jq -r '.tool_input.file_path'`). Mark it as a sketch.
