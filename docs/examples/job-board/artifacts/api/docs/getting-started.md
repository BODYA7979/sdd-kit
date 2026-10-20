# Getting started

How to install, run and test Hireboard locally. Both repos live side by side in one
workspace folder (`~/work/hireboard/api` and `~/work/hireboard/web`).

## Requirements

- PHP 8.3 with the `pdo_sqlite` extension, Composer 2
- Node 20 or newer, npm

## API (`api/`)

```bash
cd ~/work/hireboard/api
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite          # .env uses DB_CONNECTION=sqlite
php artisan migrate:fresh --seed         # local only: wipes and reseeds the dev database
php artisan serve --port=8000
```

Check it: `curl -s http://localhost:8000/api/v1/jobs -H 'Accept: application/json' | jq '.meta'`

Demo data comes from `JobBoardSeeder` (3 companies, 8 open postings, 1 closed, 1 draft) and
`DemoUserSeeder` (accounts below).

| Account | Password | Role |
|---------|----------|------|
| `candidate@hireboard.test` | `password` | candidate |
| `employer@acme.test` | `password` | employer (owns Acme Robotics) |
| `admin@hireboard.test` | `password` | admin |

## Web (`web/`)

```bash
cd ~/work/hireboard/web
npm ci
cp .env.example .env.local              # API_BASE_URL=http://localhost:8000 (server-only)
npm run dev
```

Open http://localhost:3000. The API must be running; the browser never calls it directly.

## Quality gates

A change is done only when every gate passes in the repo you touched. CI runs the same
commands (`.github/workflows/ci.yml` in each repo).

```bash
# api/
./vendor/bin/pint --test
./vendor/bin/phpstan analyse --no-progress
php artisan test                        # in-memory SQLite from phpunit.xml, never the dev DB

# web/
npm run lint
npx tsc --noEmit
npm test                                # vitest run
npm run build                           # when routes or layouts change
```

## Useful commands

```bash
php artisan route:list --path=api/v1    # endpoints, compare with web/lib/api/endpoints.ts
php artisan test --filter=SearchJobPostings
./vendor/bin/pint                       # fix style
php artisan migrate --pretend           # read the SQL before running a new migration
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `/jobs` shows "Jobs could not be loaded" | API not running or `API_BASE_URL` missing | Start `php artisan serve --port=8000`; check `web/.env.local` |
| `Database file at path [...] does not exist` | No SQLite file | `touch database/database.sqlite` |
| Tests change your dev data | Tests not using `phpunit.xml` env | Run `php artisan test`, not a custom runner pointing at `.env` |
