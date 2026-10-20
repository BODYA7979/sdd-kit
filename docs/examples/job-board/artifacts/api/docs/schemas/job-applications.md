# job_applications

A candidate's application to one job posting. Written before the migration
(`2026_10_24_090000_create_job_applications_table`) as part of HIRE-6
(`.ai/specs/spec-HIRE-6-job-applications/`).

Model: `App\Models\JobApplication` (`HasUuids`, `HasFactory`).

## Columns

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | uuid | no | generated | Primary key (INV-03) |
| `job_posting_id` | uuid | no | | FK `job_postings.id`, cascade on delete |
| `candidate_id` | bigint unsigned | no | | FK `users.id`, cascade on delete. Always a user with role `candidate` |
| `cover_letter` | text | yes | null | Max 2000 characters, validated in `SubmitApplicationDTO` |
| `created_at` | timestamp | yes | | UTC. Serialized as `submitted_at` |
| `updated_at` | timestamp | yes | | UTC. Applications are never edited in v1 |

## Indexes

| Name | Columns | Why |
|------|---------|-----|
| primary | `id` | |
| `job_applications_job_posting_id_candidate_id_unique` | `job_posting_id, candidate_id` | BR-32. The database, not the service pre-check, is what makes a concurrent duplicate impossible |
| `job_applications_candidate_id_created_at_index` | `candidate_id, created_at` | `GET /api/v1/me/applications`, newest first |

No separate foreign-key indexes are needed: the unique index leads with `job_posting_id`
and the second index leads with `candidate_id`, so both foreign keys are covered.

## Relations

| From | Relation | To | Keys |
|------|----------|----|------|
| `JobApplication` | belongsTo `jobPosting` | `JobPosting` | `job_posting_id` |
| `JobApplication` | belongsTo `candidate` | `User` | `candidate_id` |
| `JobApplication` | hasOne `candidateProfile` | `CandidateProfile` | `candidate_profiles.user_id = job_applications.candidate_id` |
| `JobPosting` | hasMany `applications` | `JobApplication` | `job_posting_id` |

`User` has no relation to applications (see `users.md`); repositories query by user id.

## Rules this table enforces or supports

| Rule | Where |
|------|-------|
| BR-30 profile required before applying | `JobApplicationService::submit()` (422 `profile_required`) |
| BR-31 only open postings accept applications | `JobApplicationService::submit()` (422 `job_not_open`) |
| BR-32 one application per candidate per posting | unique index + service pre-check; `JobApplicationRepository::create()` maps the constraint violation to 409 `already_applied` |
| BR-33 employers see applications to their own company's postings, closed included | `JobApplicationRepository::paginateForCompanyOwner()` filters on `companies.owner_id` |
| BR-21 employers see only name, email and headline | `JobApplicationDTO::toEmployerArray()` |

## Personal data

`cover_letter` and the joined candidate name, email and headline are personal data. They are
returned only to the applicant (`/me/applications`) and to the owning employer
(`/employer/applications`), never from a public endpoint. Deleting a user deletes their
applications (cascade).
