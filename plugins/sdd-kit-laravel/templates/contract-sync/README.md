# Contract-sync checker

Catches API drift between a Laravel backend and a Next.js frontend before it ships, which matters most in polyrepo setups where the two sides change in separate PRs.

`contract-sync.mjs` compares `php artisan route:list --json` against what the frontend expects, either a BFF endpoint registry or an OpenAPI document, and reports:

| Finding | Level | Meaning |
|---------|-------|---------|
| `missing-in-backend` | error | The frontend calls `METHOD /path` and the API has no such route |
| `method-mismatch` | error | The path exists on both sides with different methods (e.g. frontend `PUT`, backend `PATCH`) |
| `unused-by-frontend` | warning (error with `--strict`) | The API exposes a route the frontend never references |

Exit codes: `0` in sync, `1` drift found, `2` bad input (missing file, unparseable output). Requires Node 18+, no dependencies.

## Host compatibility

The checker is a standalone Node script. Its CI and terminal behavior is the same whether Claude Code, Codex or a person authored the change.

| Install | Template location |
| --- | --- |
| Shared checkout | `plugins/sdd-kit-laravel/templates/contract-sync/` |
| Claude file-copy | `.claude/templates/laravel/contract-sync/` |
| Claude plugin | `templates/contract-sync/` inside the installed Laravel plugin |
| Codex native plugin | `source/plugins/sdd-kit-laravel/templates/contract-sync/` inside the installed package |

Copy the checker into your project's `scripts/` and make CI its durable owner. The optional Claude hook example below is specifically for Claude payloads; do not copy it into Codex hook configuration. Native Codex workflows can run the shared contract-sync gate through their normal verification steps.

## Setup

1. Copy `contract-sync.mjs` into the frontend repo (or a shared tooling repo), e.g. `scripts/contract-sync.mjs`.
2. Edit the `CONFIG` block at the top:
   - `routesCommand` / `routesCwd`: how to get the route list (`php artisan route:list --json`, or `ddev php artisan route:list --json`), or
   - `routesFile`: a saved copy of that output (preferred in CI).
   - `registry` and `format`: path to the frontend's registry or OpenAPI file; `auto` detects `.ts`/`.js` registries, OpenAPI JSON, and plain JSON registries.
   - `backendPrefix` / `frontendPrefix`: prefixes stripped before comparing (`api`, `/api`).
   - `ignore`: path regexes to skip (Sanctum, Telescope, health checks).
3. Run it:

```bash
node scripts/contract-sync.mjs
node scripts/contract-sync.mjs --routes-file route-list.json --registry src/lib/api/endpoints.ts
node scripts/contract-sync.mjs --format openapi --registry openapi.json --json --strict
```

Every `CONFIG` key can also be set with `CONTRACT_SYNC_ROUTES_COMMAND`, `CONTRACT_SYNC_ROUTES_CWD`, `CONTRACT_SYNC_ROUTES_FILE`, `CONTRACT_SYNC_REGISTRY`, `CONTRACT_SYNC_FORMAT`, `CONTRACT_SYNC_STRICT`.

Try it on the bundled examples:

```bash
node contract-sync.mjs --routes-file examples/route-list.json --registry examples/endpoints.ts   # drift: exit 1
node contract-sync.mjs --routes-file examples/route-list.json --registry examples/openapi.json   # in sync: exit 0
```

## Supported frontend formats

**`registry-ts`** — any `.ts`/`.js` file with object literals that carry a `method` and a `path` (or `url` / `endpoint`) as string literals, in any order:

```ts
export const endpoints = {
  listInvoices: { method: 'GET', path: '/api/invoices' },
  showInvoice: { method: 'GET', path: '/api/invoices/{invoice}' },
  updateStatus: { method: 'PATCH', url: `/api/invoices/${id}/status` },
} as const;
```

Keeping one registry like this is the recommended BFF pattern: every server action and route handler calls the API through it, so the checker sees every call.

**`registry-json`** — `[{ "method": "GET", "path": "/api/invoices" }]` or `{ "listInvoices": { "method": "GET", "path": "/api/invoices" } }`.

**`openapi`** — OpenAPI 3.x / Swagger 2 in JSON. Convert YAML first (`yq -o=json openapi.yaml > openapi.json`).

Paths are compared by shape: prefixes stripped, lowercased, trailing slashes removed, and every parameter style (`{invoice}`, `{id?}`, `[id]`, `[...slug]`, `:id`, `${id}`) collapsed to `{}`. `HEAD` is ignored.

## CI (GitHub Actions)

Polyrepo: export the backend's route list as an artifact, then check it in the frontend pipeline. The route list needs a booted Laravel app but no database for most projects.

```yaml
# backend repo: .github/workflows/routes.yml
name: Export API routes
on:
  push:
    branches: [main]
  pull_request:
jobs:
  routes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
      - run: composer install --no-interaction --prefer-dist
      - run: cp .env.example .env && php artisan key:generate
      - run: php artisan route:list --json > route-list.json
      - uses: actions/upload-artifact@v4
        with:
          name: route-list
          path: route-list.json
```

```yaml
# frontend repo: .github/workflows/contract-sync.yml
name: Contract sync
on:
  pull_request:
jobs:
  contract-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Download latest backend route list
        env:
          GH_TOKEN: ${{ secrets.BACKEND_REPO_TOKEN }}   # read access to the backend repo's artifacts
        run: |
          run_id=$(gh run list -R your-org/backend -w "Export API routes" -b main -s success -L 1 --json databaseId -q '.[0].databaseId')
          gh run download "$run_id" -R your-org/backend -n route-list
      - run: node scripts/contract-sync.mjs --routes-file route-list.json
```

Monorepo: run both steps in one job and point `routesCwd` at the backend folder, or pass `--routes-file` after generating it.

Start with warnings allowed; add `--strict` once the backlog of unused routes is cleaned up or listed in `ignore`.

## As a Claude Code hook (optional, host-specific)

Run the check whenever the agent edits a route file or the registry, so drift surfaces in the same turn. Copy the script to `.claude/scripts/contract-sync.mjs` and add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "case \"$(jq -r '.tool_input.file_path // empty')\" in *routes/*.php|*endpoints.ts|*openapi.json) node \"$CLAUDE_PROJECT_DIR\"/.claude/scripts/contract-sync.mjs >&2 || exit 2;; esac; exit 0",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

Exit code `2` from a `PostToolUse` hook feeds the report (stderr) back to Claude, which then fixes the route or the registry. Other exit codes don't interrupt. If `route:list` is slow or needs Docker, set `routesFile` in `CONFIG` and regenerate it in a separate step instead of booting Laravel on every edit.

A lighter alternative is a pre-push git hook: `node scripts/contract-sync.mjs || exit 1`.

For Codex, keep the check as a project command / CI gate. Adding a custom native hook requires its own payload mapping and the host's exact-definition trust review; this template does not install one.
