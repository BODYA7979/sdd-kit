# Deep Review: spec-HIRE-6-job-applications

## Verdict: CHANGES_REQUIRED

Depth: adversarial

Scope: files listed in `.ai/specs/spec-HIRE-6-job-applications/tasks.md`, 22 in `api/` and 8 in
`../web/` (branch `feature/HIRE-6-job-applications` in both repos).
Ground truth: `docs/context/business-rules.md`, `docs/architecture.md`. The original ticket text
and the ship-feature report were deliberately not given to the reviewers.
Reviewers: `adversarial-reviewer`, plus `security-auditor` in parallel because the scope handles
personal data (candidate name, email, headline, cover letter) and authorization.

## Statistics
| Metric | Value |
|--------|-------|
| Files Reviewed | 30 |
| Critical Issues | 0 |
| Major Issues | 1 |
| Minor Issues | 1 |
| Findings dropped after re-reading the cited lines | 1 |

## Tool Verification Results
| Tool | Status | Details |
|------|--------|---------|
| Static analysis | PASS | api: `./vendor/bin/phpstan analyse --no-progress` (level 5: adversarial depth defaults to level 9, but `api/CLAUDE.md` lowers it with `deep-review: phpstan-level: 5` to match the project gate in `phpstan.neon`), 0 errors. web: `npx tsc --noEmit` (strict), 0 errors |
| Tests | PASS | api: `php artisan test`, all green, including 9 cases in `tests/Feature/Applications/`. web: `npm test`, all green. Coverage: PASS, 91.8% (pcov) |
| Formatter | PASS | `./vendor/bin/pint --test`: 0 files. `npm run lint`: 0 problems |
| Security scan | PASS | No `DB::raw`, `whereRaw`, `eval`, `exec` or hard-coded credentials in scope. No `dd(`, `dump(`, `console.log` or `debugger` |

## Critical Issues (fix before proceeding)

None.

## Major Issues (should fix)

### [MAJOR] F1: Check-then-insert race returns 500 instead of 409 already_applied
**File:** `app/Repositories/JobApplicationRepository.php:31`
**Category:** data-integrity

**Issue:** `JobApplicationService::submit()` (`app/Services/JobApplicationService.php:50`) calls
`exists()` and then `create()`. Two concurrent submits for the same candidate and posting (a
double click, or two tabs) can both pass `exists()`. The second `INSERT` then violates
`job_applications_job_posting_id_candidate_id_unique`, and the resulting
`Illuminate\Database\UniqueConstraintViolationException` is not a `BusinessRuleException`, so
the handler in `bootstrap/app.php` renders it as a generic 500. BR-32 says
"409 already_applied, also under a concurrent duplicate insert", so the second request must get
a 409. The unique index keeps the data correct; the response is what is wrong. The web
form then shows a generic error for an application that actually exists.

**Current Code:**
```php
public function create(string $jobPostingId, int $candidateId, ?string $coverLetter): JobApplicationDTO
{
    $application = JobApplication::query()->create([
        'job_posting_id' => $jobPostingId,
        'candidate_id' => $candidateId,
        'cover_letter' => $coverLetter,
    ]);

    return JobApplicationDTO::fromModel($application->load(self::RELATIONS));
}
```

**Recommended Fix:**
```php
try {
    $application = JobApplication::query()->create([...]);
} catch (UniqueConstraintViolationException) {
    throw new AlreadyAppliedException;
}
```
Add a test that calls the repository's `create()` twice for the same pair. That bypasses the
service pre-check, which is exactly the race.

**Impact:** a user-facing 500 under a common interaction (double submit), and a misleading error
message for an application that was stored.

## Minor Issues (can defer)

- `app/Http/Controllers/Applications/ListEmployerApplicationsController.php:23` - `per_page` is
  passed through unclamped (`$request->integer('per_page', 20)`), so `?per_page=100000` returns
  every applicant of the company in one response. Access is still limited to the owning
  employer, but this is a bulk export of personal data and diverges from the 1-50 rule used by
  every other list (BR-11, BR-21). Clamp to 1-50 as in `ListMyApplicationsController`.
  Raised by security-auditor.

## Dropped after re-reading

- "Cover letter rendered without escaping on `/employer/applications`": the text is rendered as a
  React text child (`web/app/(account)/employer/applications/page.tsx`), which is escaped. No
  `dangerouslySetInnerHTML` anywhere in scope.

## Positive Observations

- The employer list is scoped in SQL (`whereHas('jobPosting.company', owner_id)`) rather than
  filtered after fetching, so another company's applications never reach PHP memory.
- `JobApplicationDTO::toEmployerArray()` is an explicit allow-list (name, email, headline).
  Adding a profile column cannot leak through it by accident (BR-21).
- Rule order in `submit()` (found, open, profile, duplicate) avoids asking for a profile for a
  job that cannot be applied to.
- `findById()` versus a status-filtered lookup is documented at the call site, which protects the
  `job_not_open` behavior from a well-meant "fix".
- The browser never sees the token: the apply form posts to a Server Action, and
  `lib/api/applications.ts` is `server-only` (INV-05).

## Next Steps

1. Fix F1 in `JobApplicationRepository::create()` and add the race test; note it in the AC-4
   Traceability row.
2. Clamp `per_page` in `ListEmployerApplicationsController` (F2) in the same change.
3. Re-run `/deep-review --staged` (adversarial depth) after the fixes; a MAJOR finding is only closed by a review that can confirm the fix.
