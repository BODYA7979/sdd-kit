# Manual test: public browse journey (HIRE-1)

Copy-paste steps to verify the first slice by hand. Written by greenfield-build's Handoff
phase; the Acceptance phase walked the same steps. Later features have their own
`manual-test.md` in their spec folder.

## Setup

```bash
cd ~/work/hireboard/api && php artisan migrate:fresh --seed && php artisan serve --port=8000
cd ~/work/hireboard/web && npm run dev
```

## Steps

| # | Action | Expected |
|---|--------|----------|
| 1 | Open http://localhost:3000 | Redirects to `/jobs`. Heading "Open jobs", "8 jobs match your search." |
| 2 | Look at the order of the cards | Newest first: "Senior Laravel Engineer" (Acme Robotics) at the top, "QA Engineer" (Northwind Health) last |
| 3 | Look for "Legacy PHP Maintainer" and "Head of Engineering" | Neither appears (closed and draft postings are never public, BR-10) |
| 4 | Tick **Remote only**, press **Search** | URL is `/jobs?remote=1`. 4 cards, each with a green "Remote" badge |
| 5 | Type `engineer` in Keyword, press **Search** | URL has `q=engineer&remote=1`. Only remote postings whose title or description contains "engineer" |
| 6 | Choose Type **Contract**, untick Remote, clear Keyword, press **Search** | "Full-Stack Developer" (Blue Fern Studio) and "QA Engineer" (Northwind Health) |
| 7 | Open http://localhost:3000/jobs?company=acme-robotics | 3 Acme Robotics postings and a "Company: acme-robotics ×" chip. Clicking × removes the filter |
| 8 | Open http://localhost:3000/jobs?employment_type=permanent&page=0 | The invalid values are ignored; all 8 jobs show (no error page) |
| 9 | Click the "Senior Laravel Engineer" card title | `/jobs/<uuid>` shows title, "Acme Robotics" (a link to its careers page since HIRE-7), "Berlin", "Remote", "Full-time", posted date, description and an **Apply** button |
| 10 | Open `/jobs/00000000-0000-0000-0000-000000000000` | The "Page not found" page with a "Browse open jobs" link |
| 11 | Stop the API server and reload `/jobs` | "Jobs could not be loaded" with a **Try again** button. Restart the API, press it, the list returns |

## API spot checks

```bash
curl -s 'http://localhost:8000/api/v1/jobs?per_page=100' -H 'Accept: application/json' | jq '.meta.per_page'   # 50
curl -s 'http://localhost:8000/api/v1/companies/acme-robotics' -H 'Accept: application/json' | jq '.data.open_jobs_count'   # 3
curl -s 'http://localhost:8000/api/v1/companies/nope' -H 'Accept: application/json' | jq '.code'   # "company_not_found"
```

Closed postings by direct id (step 3's "Legacy PHP Maintainer") return 404 `job_not_found`
too. That case was missed in this slice and fixed in HIRE-9.
