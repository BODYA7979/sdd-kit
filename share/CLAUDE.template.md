# <Project name>

<!--
Project context for Claude Code. Loaded every session, so every line costs tokens.
Keep it under 200 lines and limit it to facts the agent cannot infer from the code.
Area conventions live in .claude/rules/*.md (loaded only when matching files are touched).
Replace every <placeholder>; delete any section you have nothing real for.
AGENTS.md comes from the framework's templates/AGENTS.template.md. Without it the import
below loads nothing and the commands and red lines are lost.
-->

@AGENTS.md

## Project facts

<One or two sentences: what the product does, who uses it, what must never break.>

The stack, exact commands, red lines, architecture, and code standards are in `AGENTS.md`
(imported above) so that Cursor, Codex, and Copilot users get the same core rules.
Each fact goes in one file only. Don't copy it here.

## Always load

Read these before non-trivial work. Keep each one small.

1. `<docs/context/business-rules.md>`: what the system must enforce
2. `<docs/context/architecture.md>`: layers, modules, boundaries
3. `<docs/api/api-contracts.md>`: request and response shapes the frontend relies on

## Task routing

| If you are working on | Load first |
|-----------------------|------------|
| API endpoint | `<docs/api/api-contracts.md>`, the module's Resource and DTO |
| Database schema | `<docs/schemas/>`, then `.claude/rules/migrations.md` |
| Payments / money | `<docs/integration/payments.md>`, INV-01 |
| Auth / permissions | `<docs/security/auth.md>`, the relevant Policy |
| Frontend page | `<docs/frontend/routes.md>`, the API contract for the data it shows |
| Background jobs / events | `<docs/architecture/events.md>` |
| <area> | <file> |

## Invariants

Rules that hold everywhere. Cite them by ID in specs and reviews.

- **INV-01** <Money amounts are integers in minor units. Never use floats or divide by 100 in the backend.>
- **INV-02** <All timestamps are stored in UTC and converted only at the presentation layer.>
- **INV-03** <Request handlers stay thin; business logic lives in a service layer.>
- **INV-04** <Data crosses layer boundaries as typed objects, never raw arrays or ORM models.>
- **INV-05** <Every endpoint the browser calls is listed in the API contract doc.>

## Gotchas

These traps have been confirmed in this codebase. Keep fixed entries and annotate them
(`FIXED by spec-0051`) so the history stays visible. Add new ones as they are found.

- **GOTCHA-01** <Symptom, then cause, then the correct approach. One or two lines.>
- **GOTCHA-02** <e.g. "Tests silently use the dev database unless run with --env=testing.">
- **GOTCHA-03** <e.g. "Frontend enum literals type-check but must match backend values exactly.">

## Change-impact map

| If you change | Also update |
|---------------|-------------|
| A shared data type | every constructor and mapper, events carrying it, serializers, tests |
| A database column | schema doc, factory, data type, serializer, frontend types |
| An API response shape | API contract doc, frontend types and fetchers, contract tests |
| An enum | backend enum, frontend literal union, seeders, validation rules |
| <thing> | <dependents> |

## Environment drift

- <Local runtime <x>, production runtime <y>. Don't use syntax or functions only one of them supports.>
- <Local DB is <MySQL x>, production is <managed service y>. Check collation and JSON behavior.>
- <Queues run `sync` locally and `<redis>` in production. Test async paths explicitly.>
- <Feature flags differ per environment. Read `<feature flag config>`, don't assume.>

## Trust hierarchy

When sources disagree, trust them in this order and fix whatever is lower:

1. Running code and passing tests
2. Database schema and migrations
3. API contract doc and schema docs
4. This file, rules, and other docs
5. Comments, commit messages, memory

If a doc conflicts with the code, trust the code and fix the doc in the same change.

Never state counts or versions of moving things as facts in this file or any doc
("148 endpoints", "<framework> 12.3"). Link to the source file or a script that computes them.

## How to start work

- Any feature, bug, or decision: `/sdd <description, ticket, or spec id>`. It classifies
  the work, confirms scope, and runs the matching pipeline. In plugin mode it is
  `/sdd-kit:sdd`.
- Specs live in `.ai/specs/<id>-<date>-<slug>/`. Resume one with `/sdd <spec id>`.
- Small, obvious change (typo, one-line fix): just do it, then run the gates.
- Write a failing test before you write the fix or the feature.

## Area rules

Path-scoped conventions in `.claude/rules/` load automatically when matching files are read:

| Rule file | Applies to |
|-----------|-----------|
| `tests.md` | the test directories and file patterns of this project |
| `<area>.md` | `<paths>` |

Stack add-ons ship their own rule files, and each declares its own `paths:` in its frontmatter, so they load without being listed here.

Add a rule file when one area builds up conventions. Don't grow this file instead.
