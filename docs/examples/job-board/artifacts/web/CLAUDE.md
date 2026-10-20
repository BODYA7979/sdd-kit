# Hireboard web

@AGENTS.md

## Project facts

The Next.js 15 frontend of Hireboard, a small job board. It renders every page on the
server and talks to the Laravel API (`../api/`) as a backend-for-frontend. What must never
break: the API token never reaches the browser, and pages never show data the API did not
return (a 404 from the API is a not-found page here).

The stack, exact commands, red lines, architecture and code standards are in `AGENTS.md`
(imported above). Cross-repo rules (contract, routing, process) are in the workspace
`../CLAUDE.md`. Each fact goes in one file only.

## Always load

1. `../api/docs/api/api-contracts.md`: shapes and error codes this app relies on
2. `lib/api/endpoints.ts`: the endpoints this app may call
3. `../api/docs/context/business-rules.md`: BR ids cited in specs and copy

## Task routing

| If you are working on | Load first |
|-----------------------|------------|
| A page | `.claude/rules/frontend-pages.md`, the contract section for the data it shows |
| Calling a new endpoint | the contract, then `lib/api/endpoints.ts`, `types/api/<area>.ts`, `lib/api/<area>.ts` |
| A form | the input DTO rules in the contract, an existing `*-form.tsx` and its `actions.ts` |
| Auth, session, protected pages | `../api/docs/adr/0001-spa-auth.md`, `lib/session.ts`, `middleware.ts` |
| Job search filters | `lib/search-params.ts` and its test |
| Tests | `.claude/rules/tests.md`, `vitest.config.ts` |

## Invariants

Cite them by ID in specs and reviews.

- **INV-01** API responses use the envelope `{success, status, message, data[, meta]}`;
  errors `{success: false, status, message, code[, errors]}`. Types: `types/api/common.ts`.
- **INV-04** API timestamps are ISO-8601 UTC strings. Format them for display only.
- **INV-05** The browser never holds the API token. Only `lib/session.ts` reads or writes the
  HttpOnly cookie `hireboard_session` (ADR-0001).
- **INV-06** Every endpoint this app calls is listed in `lib/api/endpoints.ts` and in the API
  contract. contract-sync (`scripts/contract-sync.mjs`) fails CI on drift.
- **INV-07** Salaries arrive as integers plus an ISO-4217 currency; format with
  `Intl.NumberFormat` and the posting's currency, never assume EUR.

## Gotchas

- **GOTCHA-01** Hand-written enum literal unions type-check even when they don't match the
  backend. Copy values from `../api/app/Enums/` exactly.
- **GOTCHA-02** `apiFetch` always uses `cache: 'no-store'`, which makes any page that calls
  the API dynamic, so nothing is fetched at build time. A raw `fetch` without it, or a
  module-level call to `baseUrl()`, would run during `npm run build` and fail because the API
  isn't running. `export const dynamic = 'force-dynamic'` is optional belt-and-braces.
- **GOTCHA-03** `next/form` keeps typed values across soft navigations. `JobFilters` sets a
  `key` from the current query so the inputs reset when the URL changes.
- **GOTCHA-04** `remote=0` in the URL is a real filter (on-site only), not "no filter".
  `parseJobFilters()` keeps it; an unchecked box omits `remote` entirely.

## Change-impact map

| If you change | Also update |
|---------------|-------------|
| A type in `types/api/` | only after the API contract changed; the fetcher and pages using it |
| `lib/api/endpoints.ts` | the API contract and route; run contract-sync |
| A protected route | `middleware.ts` matcher and the page's `requireUser()` roles |
| Filter parameters | `lib/search-params.ts`, its test, `components/job-filters.tsx` |

## How to start work

- Feature, bug or decision: `/sdd <HIRE-n: description>` (`/sdd-kit:sdd` in plugin mode).
  Most features start in `api/` and their spec lives in `../api/.ai/specs/`; a web-only
  change keeps its spec in `.ai/specs/` here.
- Small, obvious change: just do it, then run the gates.

## Area rules

Path-scoped conventions in `.claude/rules/` load when matching files are read:

| Rule file | Applies to |
|-----------|-----------|
| `frontend-pages.md` | `app/**`, `components/**`, `lib/api/**` |
| `tests.md` | `**/*.test.ts` |
