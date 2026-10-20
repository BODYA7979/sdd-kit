# <Project name>: agent instructions

<!--
Core instructions shared by every AI coding tool on this project (Claude Code, Cursor,
Codex, Copilot, Gemini CLI). Save it as AGENTS.md in the repo root.

Claude Code reads AGENTS.md only when there is no CLAUDE.md. Because this project has a
CLAUDE.md, it imports this file with `@AGENTS.md` on its own line. Keep tool-neutral facts
here and Claude-specific context (routing, gotchas, /sdd, .claude/rules) in CLAUDE.md.
Each fact goes in one file only.

Never state counts or versions of moving things as facts. Point to the file that defines them.
-->

## Stack

| Item | Value | Source of truth |
|------|-------|-----------------|
| Backend | Laravel, PHP <major>, <database> | `composer.json`, `.ddev/config.yaml` |
| Frontend | Next.js App Router, Node <major>, <npm/pnpm> | `package.json`, `.nvmrc` |
| Auth | <Passport / Sanctum / NextAuth> | `<config/auth.php>` |
| Local env | <DDEV / Docker / native> | `<.ddev/ or docker-compose.yml>` |

## Commands

Run these exact commands. A change is done only when every gate passes for the code you touched.

```bash
# Backend
<php artisan test --env=testing>          # tests (never against the dev DB)
<./vendor/bin/pest --filter=Name>         # single test
<./vendor/bin/pint --test>                # style (run without --test to fix)
<./vendor/bin/phpstan analyse>            # static analysis
<php artisan migrate --pretend>           # inspect migration SQL before running

# Frontend
<pnpm dev>                                # dev server
<pnpm test>                               # unit tests
<pnpm lint && pnpm tsc --noEmit>          # lint + types
<pnpm build>                              # production build
```

## Red lines

- Never run destructive commands against shared databases (`migrate:fresh`, `db:wipe`, raw `DROP`).
- Never commit secrets, `.env` files, or real customer data.
- Never edit a migration that has run in a shared environment. Add a new one.
- Never push to `<main branch>` directly or force-push a shared branch.
- Never weaken or delete a test to make it pass.
- <Project-specific red line>

## Architecture

```
Request -> Invokable Controller -> Service (DTOs) -> Repository -> Model
```

- **Schema first:** update `<docs/schemas/>` before writing a migration.
- **DTO first:** data crosses layers as Spatie Laravel Data DTOs, never raw arrays or models.
- **Invokable controllers:** one action per controller. Authorize, build the DTO, call the service, respond.
- **Services** own business rules and transactions. **Repositories** own queries.
- **Frontend:** Server Components by default. All backend calls go through the typed API client in `<src/lib/api/>`.
- The API contract in `<docs/api/api-contracts.md>` is authoritative for request and response shapes.

## Code standards

- Code should read like a senior developer wrote it. No history markers like `(NEW)`, `(FIXED)`,
  or `// updated per review`, and no comments that restate the code.
- Comments explain why: business rules, non-obvious constraints, security-sensitive steps.
- Write the failing test first, then the fix or feature.
- Documentation filenames are lowercase. Only `README.md`, `CLAUDE.md`, and `AGENTS.md` are uppercase.

## Git

- Branches: `<feature|fix>/<ticket>-<slug>`. Use the same branch name across repos for cross-repo work.
- Commits: Conventional Commits (`feat(orders): ...`). Keep each commit to one logical change.
- If a doc conflicts with the code, trust the code and fix the doc in the same change.
