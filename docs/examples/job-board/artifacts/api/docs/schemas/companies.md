# companies

A hiring company. Public through its careers page and as the `company` block of every job
posting. Written before the migration `2026_10_19_100000_create_companies_table` (HIRE-1).

Model: `App\Models\Company` (`HasUuids`, `HasFactory`).

## Columns

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | uuid | no | generated | Primary key (INV-03) |
| `owner_id` | bigint unsigned | yes | null | FK `users.id`, null on delete. The employer who owns the company (BR-02). Seeded companies may have none |
| `slug` | varchar(80) | no | | Unique. URL key for `/companies/{slug}`. `Str::slug(name)`, with `-2`, `-3` ... when taken (BR-02) |
| `name` | varchar(120) | no | | Display name |
| `website` | varchar(255) | yes | null | Absolute URL |
| `location` | varchar(120) | yes | null | Free text, e.g. "Berlin" |
| `description` | text | yes | null | Plain text; line breaks are kept on the careers page |
| `created_at` | timestamp | yes | | UTC (INV-04) |
| `updated_at` | timestamp | yes | | UTC |

## Indexes

| Name | Columns | Why |
|------|---------|-----|
| primary | `id` | |
| `companies_slug_unique` | `slug` | Lookup by slug; final guard for BR-02 under concurrent registration |
| `companies_owner_id_foreign` | `owner_id` | Foreign key; `findByOwnerId()` for employer screens |

## Relations

| From | Relation | To | Keys |
|------|----------|----|------|
| `Company` | belongsTo `owner` | `User` | `owner_id` |
| `Company` | hasMany `jobPostings` | `JobPosting` | `job_postings.company_id` |
| `Company` | hasMany `reviews` | `CompanyReview` | `company_reviews.company_id` (HIRE-4) |

## Derived fields

- `open_jobs_count` in the public Company shape is not a column. `CompanyRepository::findBySlug()`
  computes it with `withCount()` over postings with status `open` (BR-10).
- The average rating is not stored on the company. It is computed from approved reviews and
  returned in the reviews list `meta` (BR-43, HIRE-4 decision D1).

## Rules this table enforces or supports

| Rule | Where |
|------|-------|
| BR-02 one company per employer, unique slug | `CompanyRepository::createForOwner()` + unique index |
| BR-10 only open postings count as public | `open_jobs_count` in `CompanyRepository::findBySlug()` |
