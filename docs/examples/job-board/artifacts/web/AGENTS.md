# Hireboard web: agent instructions

Core instructions for every AI coding tool working in this repo (Claude Code, Cursor,
Codex, Copilot). Claude-specific context (routing, gotchas, `/sdd`) is in `CLAUDE.md`,
which imports this file. Each fact lives in one of the two files only.

## Stack

| Item | Value | Source of truth |
|------|-------|-----------------|
| Frontend | Next.js 15 App Router, React 19, TypeScript, Node 20+, npm | `package.json` |
| Styling | Tailwind CSS 4 | `app/globals.css`, `postcss.config.mjs` |
| Tests | Vitest, node environment, `lib/**/*.test.ts` | `vitest.config.ts` |
| Backend | separate repo `api/` (Laravel JSON API), sibling folder in the workspace | `../api/AGENTS.md`, `../api/docs/api/api-contracts.md` |
| Auth | Sanctum token kept by this server in the HttpOnly cookie `hireboard_session` (ADR-0001) | `lib/session.ts`, `../api/docs/adr/0001-spa-auth.md` |
| Local env | `npm run dev` on http://localhost:3000, API on http://localhost:8000 | `.env.example` |

## Commands

Run these exact commands. A change is done only when every gate passes. CI runs the same
gates (`.github/workflows/ci.yml`).

```bash
npm run dev            # dev server, http://localhost:3000 (needs the API on :8000)
npm run lint           # ESLint
npx tsc --noEmit       # types
npm test               # vitest run
npm run build          # production build; required when routes, layouts or middleware change
```

## Red lines

- Never send the API token to the browser: no token in client components, props, `localStorage`
  or a non-HttpOnly cookie (INV-05).
- Never expose the API URL as `NEXT_PUBLIC_*` and never call the API from client code.
- Never call `fetch` for the API outside `lib/api/client.ts`, and never call an endpoint that is
  not in `lib/api/endpoints.ts` (INV-06).
- Never commit `.env.local`.
- Never push to `main` directly or force-push a shared branch.
- Never weaken or delete a test to make it pass.

## Architecture

```
app/**/page.tsx (Server Component) -> lib/api/<area>.ts -> lib/api/client.ts apiFetch() -> API
client form (useActionState) -> server action (app/**/actions.ts) -> lib/api/<area>.ts -> API
```

- **Server Components by default.** `'use client'` only on the smallest leaf that needs state
  (forms using `useActionState`).
- **One client:** `lib/api/client.ts` (`import 'server-only'`) builds URLs from
  `lib/api/endpoints.ts`, sends `Accept: application/json` and the bearer token, uses
  `cache: 'no-store'`, and throws `ApiError { status, code, errors }` for non-2xx responses.
- **Types mirror the API** in `types/api/*.ts`, field for field, enums as literal unions copied
  from the backend enums. The API contract (`../api/docs/api/api-contracts.md`) is authoritative.
- **Nothing fetches at build time.** Pages read `searchParams` or `params`, or export
  `dynamic = 'force-dynamic'`. Next 15 `params`, `searchParams` and `cookies()` are async.
- **Protected pages:** `middleware.ts` checks that the session cookie exists; layouts and pages
  check the role again with `requireUser(roles)` from `lib/session.ts`.
- **Loading and errors:** `loading.tsx` and `error.tsx` are added per list or browse segment
  (today `app/jobs/`); other segments fall back to Next's default error page. A detail segment
  that must answer an unknown record with a real HTTP 404 (such as `app/companies/[slug]/`) gets
  no `loading.tsx`, because a loading boundary starts streaming a 200 before `notFound()` runs.
  `app/jobs/loading.tsx` and `error.tsx` also cover nested `/jobs/[id]` routes, so give a nested
  segment its own file when the list skeleton does not fit. Missing records call `notFound()`.

## Code standards

- Code should read like a senior developer wrote it. No history markers like `(NEW)`,
  `(FIXED)` or `// updated per review`, and no comments that restate the code.
- Comments explain why: contract details, security-sensitive steps, non-obvious Next.js behavior.
- Write the failing test first for pure logic in `lib/`. UI behavior is covered by the spec's
  `manual-test.md` steps.
- Components: `components/<kebab-case>.tsx`, PascalCase named exports.
- Documentation filenames are lowercase. Only `README.md`, `CLAUDE.md` and `AGENTS.md` are uppercase.

## Git

- Branches: `<feature|fix|chore>/HIRE-<n>-<slug>`, the same name as the `api/` branch for
  cross-repo work. Merge after the `api/` PR when the change is additive.
- Commits: Conventional Commits (`feat(jobs): ...`). One logical change per commit.
- If a doc conflicts with the code, trust the code and fix the doc in the same change.
