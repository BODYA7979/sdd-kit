# Schema: users

## Purpose
Everyone who signs in: candidates, employers and admins. Laravel's default `users` table, extended
with a `role` column for HIRE-3 (`spec-HIRE-3-accounts-and-roles`). Written before the migration
`2026_10_21_090000_add_role_to_users_table`, per the schema-first rule.

## Fields

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | bigint unsigned | No | auto increment | Primary key. Stays bigint so Sanctum's `personal_access_tokens.tokenable_id` morph works unchanged (INV-03) |
| name | string(255) | No | — | Display name; registration validates 2-120 chars |
| email | string(255) | No | — | Unique, always stored lowercase (BR-03) |
| email_verified_at | timestamp | Yes | null | Unused in v1 (email verification is out of scope) |
| password | string(255) | No | — | Bcrypt hash via the `hashed` cast; registration requires 8+ chars |
| role | string(20) | No | `candidate` | `UserRole` value: `candidate`, `employer` or `admin` (added by HIRE-3) |
| remember_token | string(100) | Yes | null | Laravel default; unused by the token API |
| created_at | timestamp | Yes | null | UTC (INV-04) |
| updated_at | timestamp | Yes | null | UTC (INV-04) |

## Relationships
- has_many: personal_access_tokens (Sanctum morph `tokenable`), deleted on logout one token at a time
- referenced by: companies.owner_id (nullOnDelete), and in later features candidate_profiles.user_id,
  job_applications.candidate_id, company_reviews.candidate_id and company_reviews.moderated_by
- `User` declares no relations to the domain models on purpose; repositories query by user id.

## Indexes
- PRIMARY: id
- UNIQUE: email (purpose: one account per email, BR-03)
- INDEX: role (purpose: admin and reporting queries by role)

## Constraints
- role: one of the `App\Enums\UserRole` values. Self-registration accepts only `candidate` or
  `employer` (BR-01); admins are created by `DemoUserSeeder` or by hand, never through the API.
- email: lowercased by `RegisterUserDTO` / `LoginDTO` before validation and lookup.

## Enums
- `App\Enums\UserRole` (string-backed): `candidate`, `employer`, `admin`. The web mirror is
  `UserRole` in `web/types/api/auth.ts`.

## Notes
- BR-02: an employer registration also creates exactly one company with `owner_id` = the new user.
- BR-04: tokens are Sanctum personal access tokens named `web` with a 7-day `expires_at`.
- Migration is additive with a default, so existing rows become candidates. `down()` drops the
  index before the column because SQLite cannot drop an indexed column.
