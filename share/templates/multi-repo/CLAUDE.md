# <Project name> workspace

<!--
Root context for a parent-folder workspace that holds separate repos. This folder has no
.git on purpose. Copy this file to <workspace>/CLAUDE.md and start Claude from here.
The imports pull in each repo's own context; this file adds only what neither repo knows
alone. Setup and traps: docs/multi-repo.md in the framework.
-->

@be/CLAUDE.md
@fe/CLAUDE.md

## Layout

| Folder | Repo | Stack | Gates |
|--------|------|-------|-------|
| `be/` | `<git remote>` | Laravel API | see `be/AGENTS.md` |
| `fe/` | `<git remote>` | Next.js (BFF) | see `fe/AGENTS.md` |

## Contract

- The API contract lives in `<be/docs/api/api-contracts.md>`. **The backend is authoritative.**
  When the frontend and the contract disagree, the frontend is wrong.
- Every backend endpoint the browser calls is registered in `<fe/src/lib/api/registry.ts>`.
- Frontend types mirror backend DTOs and Resources in `<fe/src/types/api/>`. Enum literals
  must match the backend enum values exactly.
- Check drift with `<script or CI job that diffs routes/OpenAPI against the registry>`.
  Don't trust counts written in any doc.

## Cross-repo routing

| If you change | Read first | Then update |
|---------------|------------|-------------|
| A backend DTO or Resource | `be/` Resource + DTO | `fe/` type mirror, fetcher, affected pages |
| A route path, method, or auth | `be/routes/api.php` | `fe/` registry, API client, middleware |
| Validation rules | `be/` FormRequest or input DTO | `fe/` form schema and error mapping |
| An enum | `be/` enum class | `fe/` literal union, labels, filters |
| Auth or session flow | both auth configs | both sides, in matching branches |
| <thing> | <file> | <dependents> |

**Rule of thumb:** if a backend change could be visible to the browser, assume the frontend
has to change too. Grep `fe/` before you call the backend task done.

## Process

- Commit in each repo separately (`git -C be ...`, `git -C fe ...`). Never run git from this root.
- Use the same branch name in both repos for one change: `<feature|fix>/<ticket>-<slug>`.
- A spec lives in the repo that starts the change (usually `be/.ai/specs/`). It lists every
  affected repo with per-repo tasks. `resume_hint` in the session state hands off between repos.
- Workflows take both repos: `/sdd <ticket>`, or pass `{ repos: { backend: "be", frontend: "fe" } }`.
  Each repo's gates run separately.
- Merge order: backend first when the change is additive. Use expand/contract when it breaks the contract.

## Environment

- Backend local URL: `<https://be.ddev.site>`. Frontend local URL: `<http://localhost:3000>`.
- The frontend reads the backend URL from `<fe/.env.local: API_BASE_URL>`.
- <Drift warning, e.g. "staging frontend points at staging API; never at production">
