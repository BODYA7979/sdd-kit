# Schema: candidate_profiles

## Purpose
One private profile per candidate: the headline, skills and experience a candidate shows when they apply to a job. Written for HIRE-5 (`spec-HIRE-5-candidate-profiles`) before the migration, per the schema-first rule.

## Fields

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | auto (HasUuids) | Primary key (INV-03) |
| user_id | bigint unsigned | No | — | Owning candidate, FK `users.id`, unique |
| headline | string(120) | No | — | One-line summary, 3-120 chars |
| location | string(120) | Yes | null | Free text, e.g. "Berlin" |
| bio | text | Yes | null | Up to 2000 chars (validated in the API) |
| skills | json | No | — | Array of 0-20 strings, each 1-40 chars, unique case-insensitively |
| years_experience | unsigned tinyint | No | — | 0-60 |
| open_to_work | boolean | No | true | Candidate is looking for a job |
| created_at | timestamp | Yes | null | UTC (INV-04) |
| updated_at | timestamp | Yes | null | UTC; serialized as `updated_at` |

## Relationships
- belongs_to: users (foreign_key: user_id), on delete cascade
- `User` has no `profile()` relation on purpose; repositories query by `user_id`.

## Indexes
- PRIMARY: id
- UNIQUE: user_id (purpose: one profile per candidate, BR-20)

## Constraints
- user_id: must reference a user whose role is `candidate`. Enforced by `CandidateProfilePolicy::manage`, not by the database.
- skills: no duplicates when compared case-insensitively ("PHP" and "php" are the same skill). Enforced by `distinct:ignore_case` in `UpsertCandidateProfileDTO`.

## Enums
None.

## Notes
- BR-20: one profile per candidate, and only candidates have profiles.
- BR-21: the profile is private. It is read and written only through `/api/v1/me/profile`, resolved from the authenticated user, with no endpoint taking a profile id. Employers see name, email and headline only through applications to their own jobs (HIRE-6), never the full profile.
- `PUT /api/v1/me/profile` is a full replacement (upsert). Omitted nullable fields become null.
