# job_postings

A job a company advertises. Only `open` postings are public. Written before the migration
`2026_10_19_100100_create_job_postings_table` (HIRE-1).

Model: `App\Models\JobPosting` (`HasUuids`, `HasFactory`).

## Columns

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | uuid | no | generated | Primary key (INV-03) |
| `company_id` | uuid | no | | FK `companies.id`, cascade on delete |
| `title` | varchar(120) | no | | Searched by `q` |
| `description` | text | no | | Plain text. Searched by `q` |
| `location` | varchar(120) | no | | Free text. Filter `location` matches a substring |
| `remote` | boolean | no | false | Filter `remote=1` / `remote=0` |
| `employment_type` | varchar(20) | no | | Cast to `App\Enums\EmploymentType` |
| `salary_min` | integer unsigned | yes | null | Annual, whole currency units (INV-07, BR-12) |
| `salary_max` | integer unsigned | yes | null | Same unit. `salary_min <= salary_max` when both are set (BR-12) |
| `salary_currency` | char(3) | no | `EUR` | ISO 4217 |
| `status` | varchar(20) | no | `draft` | Cast to `App\Enums\JobPostingStatus` |
| `published_at` | timestamp | yes | null | UTC. Set when the posting opens. Sort key for search (BR-11) |
| `created_at` | timestamp | yes | | UTC |
| `updated_at` | timestamp | yes | | UTC |

## Enums

```php
enum EmploymentType: string { case FullTime = 'full_time'; case PartTime = 'part_time'; case Contract = 'contract'; case Internship = 'internship'; }
enum JobPostingStatus: string { case Draft = 'draft'; case Open = 'open'; case Closed = 'closed'; }
```

The web mirrors both as literal unions in `web/types/api/jobs.ts`. Values must match exactly.

## Indexes

| Name | Columns | Why |
|------|---------|-----|
| primary | `id` | |
| `job_postings_company_id_foreign` | `company_id` | Foreign key; company filter and open job count |
| `job_postings_status_published_at_index` | `status, published_at` | Search: `where status = open order by published_at desc` (BR-10, BR-11) |

## Relations

| From | Relation | To | Keys |
|------|----------|----|------|
| `JobPosting` | belongsTo `company` | `Company` | `company_id` |
| `JobPosting` | hasMany `applications` | `JobApplication` | `job_applications.job_posting_id` (HIRE-6) |

## Status lifecycle

```
draft ──publish──> open ──close──> closed
```

Employers publishing and closing postings is HIRE-11 (not built yet). Until then postings
change status through the seeder or tinker only.

## Rules this table enforces or supports

| Rule | Where |
|------|-------|
| BR-10 only open postings are public | `JobPostingRepository::searchOpen()` and `findOpenById()`. `findById()` ignores status and is for internal callers only (applications, BR-31) |
| BR-11 newest published first, `per_page` 1-50 | `searchOpen()` ordering; cap in `JobPostingService::search()` |
| BR-12 / INV-07 salary as integers plus currency | column types; `JobPostingDTO::toApiArray()` returns `salary: null` when neither bound is set |
| BR-31 / BR-33 closed postings still exist for applications | rows are never deleted on close |
