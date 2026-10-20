# Hireboard workspace

Root context for the Hireboard workspace. This folder has no `.git` on purpose: `api/` and
`web/` are separate repositories. Start Claude here for cross-repo work. The imports below
pull in each repo's own context; this file holds only what neither repo knows alone.

@api/CLAUDE.md
@web/CLAUDE.md

## Product

Hireboard is a small job board. Visitors search open job postings and read company careers
pages. Candidates keep a private profile, apply to jobs and review companies. Employers see
applications to their own company's jobs. Admins moderate every review before it goes public.

- Product brief, roles, scope and non-goals: `product-brief.md`
- Business rules (canonical, validated by Maya Chen): `api/docs/context/business-rules.md`.
  Specs cite rules by ID (`BR-xx`) and invariants by ID (`INV-xx`).
- Decisions: `api/docs/adr/` (ADR-0001: SPA auth through the Next.js server)

### Invariants

These hold across both repos. A change that breaks one needs an ADR first.

| ID | Invariant |
|----|-----------|
| INV-01 | The API lives under `/api/v1`. Success envelope `{success, status, message, data[, meta]}`; paginated `meta` is `{current_page, per_page, total, last_page}`. Error envelope `{success: false, status, message, code[, errors]}`. |
| INV-02 | Single-action invokable controllers, business logic in services, DTOs (`App\DTOs`, Spatie Laravel Data v4) across layers, repositories behind `App\Contracts` interfaces. |
| INV-03 | Domain tables use UUID keys; `users` keeps bigint ids (Sanctum token morphs stay unchanged). |
| INV-04 | Timestamps are stored in UTC and serialized as ISO-8601. |
| INV-05 | The browser never holds the API token. The Next.js server keeps it in the HttpOnly cookie `hireboard_session` (ADR-0001). |
| INV-06 | Every endpoint the browser calls is listed in `web/lib/api/endpoints.ts` and `api/docs/api/api-contracts.md`. |
| INV-07 | Salaries are integers (annual, whole currency units) plus an ISO-4217 currency. |

## Layout

| Folder | Repo | Stack | Gates |
|--------|------|-------|-------|
| `api/` | `git@github.com:hireboard/api.git` | Laravel 12 JSON API (PHP 8.3, Sanctum, Pest 3, SQLite in dev) | see `api/AGENTS.md` |
| `web/` | `git@github.com:hireboard/web.git` | Next.js 15 App Router (BFF, TypeScript, Tailwind 4, Vitest) | see `web/AGENTS.md` |

## Contract

- The API contract lives in `api/docs/api/api-contracts.md`. **The backend is authoritative.**
  When the frontend and the contract disagree, the frontend is wrong.
- Every backend endpoint the browser calls is registered in `web/lib/api/endpoints.ts`
  (INV-06). Pages and server actions call the API only through `web/lib/api/client.ts`.
- Frontend types mirror backend DTO output (`toApiArray()` and friends) in `web/types/api/`.
  Enum literals must match the backend enum values exactly (`UserRole`, `EmploymentType`,
  `JobPostingStatus`, `ReviewStatus`).
- Error codes (`job_not_found`, `already_applied`, ...) are part of the contract. The web
  forms map them to messages, so a renamed code is a breaking change.
- Check drift with `web/scripts/contract-sync.mjs`: it compares `php artisan route:list --json`
  from `api/` with the registry and fails on a mismatch. CI runs it on every web PR
  (`web/.github/workflows/contract-sync.yml`). Don't trust endpoint counts written in any doc.

## Cross-repo routing

| If you change | Read first | Then update |
|---------------|------------|-------------|
| A DTO's output (`toApiArray()`, `toOwnerArray()`, ...) | `api/app/DTOs/` + `api/docs/api/api-contracts.md` | `web/types/api/*.ts`, the fetcher in `web/lib/api/`, affected pages |
| A route path, method or auth middleware | `api/routes/api/v1/*.php` | `web/lib/api/endpoints.ts`, `api/docs/api/api-contracts.md`, `web/middleware.ts` matcher |
| Validation rules or field names | the input DTO in `api/app/DTOs/` | the matching form component and its server action error mapping |
| A domain error code | `api/app/Exceptions/*Exception.php` | the server action that maps `ApiError.code` to a message |
| An enum | `api/app/Enums/` | the literal union in `web/types/api/`, labels and filters |
| Auth or session flow | ADR-0001, `api/app/Services/AuthService.php` | `web/lib/session.ts`, `web/middleware.ts`, `web/app/(auth)/actions.ts`, in matching branches |
| A table or column | `api/docs/schemas/*.md` (schema-first) | migration, model, factory, then the DTOs above |
| A business rule | `api/docs/context/business-rules.md` | the specs that cite it; ask Maya Chen first |

**Rule of thumb:** if a backend change could be visible to the browser, assume the frontend
has to change too. Grep `web/` before you call the backend task done.

## Process

- Tickets use the `HIRE` prefix. No tracker is connected: paste the ticket text into `/sdd`.
- Commit in each repo separately (`git -C api ...`, `git -C web ...`). Never run git from this root.
- Use the same branch name in both repos for one change: `<feature|fix|chore>/HIRE-<n>-<slug>`,
  for example `feature/HIRE-4-company-reviews`. One PR per repo; link them to each other.
- Commit subjects follow Conventional Commits (the kit's commit hook enforces it).
- Features go `/sdd` -> write-spec -> approval by Maya Chen in the same `/sdd` conversation
  -> ship-feature or `/execute-task`. Pass both repos to workflows:
  `{ repos: { backend: "api", frontend: "web" }, url: "http://localhost:3000" }`.
- Each repo's gates run in that repo. A failure in one blocks the change.
- Merge order: `api` first when the change is additive. Use expand/contract when it breaks
  the contract: add the new shape, move `web` over, then remove the old shape.

## Where outputs land

Workflows and skills write relative to the directory the session started in.

- **Specs live in the repo that starts the change**, usually `api/.ai/specs/spec-HIRE-<n>-<slug>/`
  (a web-only change uses `web/.ai/specs/`). Workflows accept a repo-relative folder from this root:
  `spec: "api/.ai/specs/spec-HIRE-4-company-reviews"`. `/execute-task --spec=` and `/deep-review --spec=`
  resolve only against `./.ai/specs` of the session directory and do not accept a repo-relative path,
  so run them from a session started inside the owning repo, where `--spec=HIRE-5` or the full folder
  name resolves.
- **Root `.ai/` is local scratch and is never committed** (this folder has no git):
  anything a skill writes while the session runs from the root lands here. `/execute-task` state
  and verification reports land in the owning repo's `.ai/`, because `/execute-task` runs there.
- **One-file outputs you want committed** (tech-research ADR in `docs/adr/`, a qa-and-docs plan
  in `docs/qa/`, `/deep-review` reports in `.ai/reviews/`): start the session inside the owning repo
  so the file lands in that repo:

  ```bash
  cd api && CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../web
  cd web && CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../api
  ```

  In such a session the repos are `"."` and `"../web"` (or `"."` and `"../api"`), not `api`/`web`.

## Environment

- API: `http://localhost:8000` (`cd api && php artisan serve --port=8000`).
- Web: `http://localhost:3000` (`cd web && npm run dev`). This is the `url` for every workflow.
- The web server reads the API URL from `web/.env.local`: `API_BASE_URL=http://localhost:8000`.
  Never expose it as `NEXT_PUBLIC_*`: the browser never calls `:8000` directly (INV-05), so
  the API needs no CORS config.
- Local data: `cd api && php artisan migrate:fresh --seed`. Local only, never against a shared
  database. Demo accounts (password `password`): `candidate@hireboard.test`,
  `employer@acme.test`, `admin@hireboard.test`.
