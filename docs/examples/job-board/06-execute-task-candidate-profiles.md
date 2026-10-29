# 06 — Build task by task and resume: candidate profiles with /execute-task (HIRE-5)

## Execute and resume tasks in Codex

Use the same approved HIRE-5 spec. For direct task execution, open `api/` with access to the sibling `web/`, or explicitly provide the spec path from the parent workspace. Read both repositories' `AGENTS.md` before cross-repo edits.

```text
$sdd HIRE-5
$execute-task --spec=HIRE-5
$execute-task --spec=HIRE-5 --continue
$progress
$deep-review --staged
```

Choose **Approve only** to follow this chapter's task-by-task path. These `execute-task` checkpoints are the shared `.ai/session/` state. They are distinct from an interrupted native workflow's receipts in `.ai/codex-workflows/`; a workflow requires resume/reconnect with its original run id and workers. A new chat does not prove prior gate results are still current. The same manual tests and explicit review remain necessary before PRs.

**Reading the original walkthrough:** slash skill names below use Claude file-copy shorthand; Claude plugins add their package namespace. `Workflow(...)`, `/workflows`, `CLAUDE.md` imports and `.claude` settings describe that host. Use the concrete Codex path above. All simulated outputs remain labelled examples.

In chapters [04](04-feature-accounts-and-roles.md) and [05](05-feature-company-reviews-full-spec.md), approved specs went straight into `ship-feature`, which builds the whole feature in the background. This chapter uses the interactive alternative. Maya approves the spec without building it, then Alex runs `/execute-task` one task at a time, with TDD and a verification report after each task. He stops halfway at the end of the day and picks up the next morning in a fresh session from the saved state.

| | |
|---|---|
| Ticket | HIRE-5 "Candidate profiles" (no tracker, so the text is pasted, F8) |
| Route | `feature`: write-spec, then human approval (**Approve only**), then `/execute-task` |
| Spec | `api/.ai/specs/spec-HIRE-5-candidate-profiles/` (M, 4 tasks) |
| Branch | `feature/HIRE-5-candidate-profiles` in `api/` and `web/` |
| Dates | 2026-10-23 (spec, approval, tasks 1-2) and 2026-10-24 (tasks 3-4) |

Use `/execute-task` instead of `ship-feature` when you want to see each red test and each diff before moving on, when the work spans days, or when you are learning a codebase. The kit's short version of this flow is [USAGE-EXAMPLES.md, scenario 7](../../reference/usage-examples.md#7-plan-interactively-build-task-by-task).

> Agent output in this chapter is **simulated** and abridged. The commands, flags, file paths and file formats are the kit's real ones.

---

## 1. Branches and the spec

Both repos get the same branch name ([docs/multi-repo.md, Process](../../reference/multi-repo.md#process)):

```bash
cd ~/work/hireboard
git -C api switch -c feature/HIRE-5-candidate-profiles
git -C web switch -c feature/HIRE-5-candidate-profiles
```

`write-spec` creates the spec folder under `./.ai/specs` relative to the session's working directory. The spec belongs in `api/`, the repo that starts the change, so Alex starts this session inside `api/` and adds `web/` (F3):

```bash
cd ~/work/hireboard/api
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../web
```

Chapter 04 ran `/sdd` from the workspace root instead and checked that the hand-off path started with `api/`. Both approaches work. Starting inside the repo means the folder can't land in the wrong place.

```
/sdd HIRE-5
```

```text
(simulated)
No spec found for HIRE-5 in .ai/specs/. No tracker tool (Jira/Linear MCP or CLI) is available
in this session, so please paste the ticket text.
```

Alex pastes the ticket:

```text
HIRE-5 Candidate profiles
Candidates create and edit a private profile (headline, location, bio, skills, years of
experience, open to work).
```

```text
(simulated)
Route: feature. Adds new behavior (a new table and endpoints), and no technology choice is open.
  > feature (recommended)
    trivial
Repos: backend ".", frontend "../web" (detected from --add-dir). Dev URL: http://localhost:3000

Running Skill("write-spec", "--ticket=HIRE-5 Candidates create and edit a private profile ...")

Size: M. New table and two API endpoints plus a web page, 4 tasks.
Investigation:
  - exists: Sanctum auth, UserRole, User::isCandidate(), requireUser(), (account) layout with a
    "Profile" nav link for candidates, middleware matcher '/profile/:path*' (HIRE-3)
  - pattern to follow: CompanyReviewPolicy (role gate), SubmitCompanyReviewDTO (validated input),
    app/companies/[slug]/reviews/actions.ts (422 -> field errors)
  - business rules already recorded: BR-20 (one profile, candidates only), BR-21 (private),
    BR-30 (needed before applying, used by HIRE-6)
Wrote .ai/specs/spec-HIRE-5-candidate-profiles/  spec-lite.md, tasks.md  (status: draft)
```

The ticket and BR-20/BR-21 already say what the profile holds and who sees it, so `write-spec` skips its clarifying questions and moves on to the clarity gate. This is a fresh agent that reads only the spec folder:

```text
(simulated)
Clarity gate (fresh context, spec folder only): 2 raised
  [ ] Q1: Are "PHP" and "php" the same skill? Is a duplicate merged or rejected?
  [ ] Q2: Can an employer read a candidate's profile directly, e.g. from an application?
```

Alex asks Maya Chen, the product owner, and records her answers:

- **Q1**: Yes, it is the same skill. Skills are trimmed and compared case-insensitively, and a duplicate is rejected with 422 on that item (`skills.N`). The answer goes into AC-3.
- **Q2**: No. Per BR-21 there is no employer-facing profile endpoint. HIRE-6 shows name, email and headline inside an application only. The answer goes into Scope and Boundaries.

```text
(simulated)
Spec:   .ai/specs/spec-HIRE-5-candidate-profiles/   (size M, status draft)
Files:  spec-lite.md, tasks.md (4 tasks)
Clarity gate: 2 raised, 2 resolved — ready for approval
```

The criteria in [`spec-lite.md`](artifacts/api/.ai/specs/spec-HIRE-5-candidate-profiles/spec-lite.md), in short:

| ID | Criterion |
|----|-----------|
| AC-1 | GET before the profile exists returns 404 `profile_not_found` |
| AC-2 | PUT upserts, then GET returns the profile |
| AC-3 | Headline 3-120 chars, up to 20 unique skills (ignoring case) of up to 40 chars each, years 0-60, otherwise 422 |
| AC-4 | Employer or admin gets 403 |
| AC-5 | Guest gets 401 |
| AC-6 | Web: `/profile` pre-fills, saves and shows "Profile saved" (manual) |
| MNC-1 | `/api/v1/auth/me` unchanged |
| MNC-2 | Public endpoints unchanged |

> **About the file set.** For an M spec with a UI, `write-spec` normally adds `manual-test.md`. In `ship-feature`, the TestPlan phase fills it in. `/execute-task` has no TestPlan phase, and this journey is a single screen, so the spec keeps its one manual check inside task 4 as step 4.4. The AC-6 Traceability row points to that step.

## 2. Approve only

`/sdd` continues straight into its Step 4b approval gate in the same conversation:

```text
(simulated)
Spec: .ai/specs/spec-HIRE-5-candidate-profiles/spec-lite.md
Scope: private candidate profile, GET/PUT /api/v1/me/profile, /profile page
Must NOT change: /auth/me shape; public endpoints stay tokenless and unchanged
Boundaries: never an endpoint that takes a profile or user id; ask before touching users
6 acceptance criteria (5 API tests, 1 manual)

How do you want to proceed?
    Approve and build
  > Approve only
    Request changes
    Stop here (draft)
Approved by? (git config user.name says "Alex Rivera")  > Maya Chen
```

Maya approves the spec in the session, sitting next to Alex. Approval only counts when it is given in the current `/sdd` conversation (F7). `/sdd` writes the frontmatter and launches nothing:

```yaml
status: approved
approved_by: Maya Chen
approved_at: 2026-10-23T08:30:00Z
```

```text
(simulated)
Route:    feature (confirmed)
Ticket:   HIRE-5
Spec:     .ai/specs/spec-HIRE-5-candidate-profiles/ (approved by Maya Chen, 2026-10-23T08:30:00Z)
Launched: nothing (Approve only). Build task by task: /execute-task --spec=HIRE-5
Ticket link-back: skipped (no tracker tool)
```

The suggested `--spec=HIRE-5` is exactly what Alex types next. `/execute-task` looks in `./.ai/specs`, so the build session also starts inside `api/`, with `web/` added so both repos are in scope.

## 3. Day one: tasks 1 and 2 in `api/`

Alex starts a new session inside `api/`, with `web/` added. Starting inside the owning repo, as in step 1, keeps the spec resolver simple and puts the session state and reports in that repo (F3):

```bash
cd ~/work/hireboard/api
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../web
```

```
/execute-task --spec=HIRE-5
```

> **F2: where the spec resolver looks.** `/execute-task` resolves `--spec` against `./.ai/specs` in the session's working directory and accepts a folder name, number, ticket key or timestamp id, not a repo-relative path. That is why this session starts in `api/` and uses `--spec=HIRE-5`. The workflows (`ship-feature` and others) are the ones that accept a repo-relative folder from the workspace root.

### Task 1: schema first

```text
(simulated)
Execute Task: Spec spec-HIRE-5-candidate-profiles - Candidate profiles
Status: approved -> in-progress (spec-lite.md frontmatter)
Progress: ░░░░░░░░░░ 0/4 (0%)

Current Task: 1. Schema doc, migration, model and factory for candidate_profiles (laravel)
Type: database -> loading api/docs/schemas/ and the schema-first conventions only

Schema first: wrote api/docs/schemas/candidate-profiles.md
  uuid id (INV-03), user_id unique FK cascade (BR-20), json skills, tinyint years_experience
Migration: api/database/migrations/2026_10_23_090000_create_candidate_profiles_table.php
Model:     api/app/Models/CandidateProfile.php (HasUuids; casts skills array, open_to_work bool)
Factory:   api/database/factories/CandidateProfileFactory.php (user_id -> User::factory()->candidate())
Check:     cd api && php artisan migrate:fresh --seed   OK (local SQLite)

Verification Gates (api/):
  [PASS] 1. Code Style (Pint)
  [PASS] 2. Static Analysis (PHPStan)
  [PASS] 3. No Debug Statements
  [PASS] 4. Tests Passing (33/33)
  [SKIP] 5-7. no business logic / TS / UI changed (logged)

Task 1 COMPLETE
Report: .ai/verification/spec-HIRE-5-candidate-profiles/task-1-20261023-1210.md
Session state saved.
Next: Task 2 - Show and upsert endpoints with policy and tests (laravel)
```

The schema doc is written before the migration, and that order is the schema-first rule. The finished doc is [`artifacts/api/docs/schemas/candidate-profiles.md`](artifacts/api/docs/schemas/candidate-profiles.md), and the migration follows it column by column:

```php
Schema::create('candidate_profiles', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
    $table->string('headline', 120);
    // ...
    $table->json('skills');
    $table->unsignedTinyInteger('years_experience');
    $table->boolean('open_to_work')->default(true);
    $table->timestamps();
});
```

If you are writing a migration by hand outside a spec, `/migrate-db --create=candidate_profiles` follows the same schema-doc-first steps. Run it yourself, because it executes migrations and is user-invoked only, so `execute-task` cannot call it for you.

### Task 2: red, then green

By default, `execute-task` pauses after each task. Alex reads the task 1 diff and runs the same command again. It picks the first `- [ ] N.` line in `tasks.md`:

```
/execute-task --spec=HIRE-5
```

```text
(simulated)
Progress: ███░░░░░░░ 1/4 (25%)
Current Task: 2. Show and upsert endpoints with policy and tests (laravel)

RED Phase (test-writer): 7 tests, 7 failing
  tests/Feature/Profiles/ShowMyProfileTest.php
    x returns 404 profile_not_found before the profile exists      (AC-1)  404 route not found
    x returns the candidate profile                                 (AC-2)
  tests/Feature/Profiles/UpsertMyProfileTest.php
    x creates the profile on first save                            (AC-2)
    x updates the existing profile                                 (AC-2)
    x validates headline, skills and years of experience           (AC-3)
    x forbids employers                                            (AC-4)
    x requires authentication                                      (AC-5)

GREEN Phase (laravel-backend-dev):
  DTOs        UpsertCandidateProfileDTO (rules: skills.* distinct:ignore_case), CandidateProfileDTO
  Contract    CandidateProfileRepositoryInterface (findByUserId, upsertForUser)
  Repository  CandidateProfileRepository, bound in RepositoryServiceProvider::$bindings
  Service     CandidateProfileService (findForUser -> ProfileNotFoundException, upsert)
  Policy      CandidateProfilePolicy::manage (candidates only)
  HTTP        Profiles\ShowMyProfileController, Profiles\UpsertMyProfileController,
              routes/api/v1/profiles.php
  Docs        docs/api/api-contracts.md: GET/PUT /api/v1/me/profile
  7/7 passing

REFACTOR Phase: moved the 404 from the controller into CandidateProfileService::findForUser

Verification Gates (api/): Pint PASS, PHPStan PASS, debug scan PASS, tests 40/40 PASS
Must NOT change: LoginTest 'returns the current user' PASS, PublicEndpointsGuardTest PASS

Task 2 COMPLETE
Report: .ai/verification/spec-HIRE-5-candidate-profiles/task-2-20261023-1745.md
Traceability: AC-1..AC-5, MNC-1, MNC-2 -> real test names
Session state saved.
Next: Task 3 - Types, fetchers and saveProfileAction (nextjs)
```

The full report is [`task-2-20261023-1745.md`](artifacts/api/.ai/verification/spec-HIRE-5-candidate-profiles/task-2-20261023-1745.md). It records the TDD phases, every gate (skipped gates come with a reason, never silently omitted), the MNC guards and the files touched.

A few lines carry the business rules. AC-3 and the Q1 answer live in the input DTO's rules, keyed by the snake_case input names:

```php
// app/DTOs/UpsertCandidateProfileDTO.php
'skills' => ['present', 'array', 'max:20'],
'skills.*' => ['required', 'string', 'max:40', 'distinct:ignore_case'],
'years_experience' => ['required', 'integer', 'between:0,60'],
```

BR-21 (the profile is private) is a matter of shape: no route takes an id, and the profile always comes from the token's user:

```php
// app/Http/Controllers/Profiles/ShowMyProfileController.php
$this->authorize('manage', CandidateProfile::class);

$profile = $this->profiles->findForUser((int) $request->user()->id);

return $this->resource($profile->toApiArray());
```

The two lines added to files owned by [chapter 02](02-greenfield-first-slice.md), which already contain them in their final state:

```diff
 // app/Providers/RepositoryServiceProvider.php, $bindings
+    CandidateProfileRepositoryInterface::class => CandidateProfileRepository::class,
```

```diff
 // web/lib/api/endpoints.ts (added in task 3)
+  showMyProfile: { method: 'GET', path: '/api/v1/me/profile' },
+  upsertMyProfile: { method: 'PUT', path: '/api/v1/me/profile' },
```

The rest of the API code is in [`artifacts/api/app/`](artifacts/api/app/): `Services/CandidateProfileService.php`, `Repositories/CandidateProfileRepository.php`, `Policies/CandidateProfilePolicy.php`, `Exceptions/ProfileNotFoundException.php`, plus the routes file [`routes/api/v1/profiles.php`](artifacts/api/routes/api/v1/profiles.php) and the tests in [`tests/Feature/Profiles/`](artifacts/api/tests/Feature/Profiles/).

If a gate had failed, the task would stay unchecked, the failure would go into the state file, and `execute-task` would stop. After fixing it, Alex would re-run just that task:

```
/execute-task --spec=HIRE-5 --task=2
```

## 4. End of day: close the session

It is 17:50. The API half is green and the web half has not started. Alex leaves the changes uncommitted in `api/` for the review in step 7, and quits Claude Code. Nothing is lost, because `execute-task` wrote its state after each task:

[`api/.ai/session/spec-HIRE-5-candidate-profiles-state.json`](artifacts/api/.ai/session/spec-HIRE-5-candidate-profiles-state.json)

```json
{
  "spec_id": "spec-HIRE-5-candidate-profiles",
  "spec_folder": "spec-HIRE-5-candidate-profiles",
  "spec_path": ".ai/specs/spec-HIRE-5-candidate-profiles",
  "current_task": 3,
  "total_tasks": 4,
  "completed_tasks": [1, 2],
  "last_updated": "2026-10-23T15:52:00Z",
  "resume_hint": "Tasks 1-2 done in api/ (profile API green). Next: task 3 in web/ - types/api/profiles.ts, lib/api/profiles.ts, saveProfileAction"
}
```

(The artifact also lists the two verification reports and an empty `failures` array.) The `resume_hint` names the next repo. In a split workspace, that is the one thing a fresh session cannot guess from `tasks.md` alone.

> **F3: where the state lives.** The state file and the verification reports are written relative to the session's working directory, so they land in `api/.ai/session/` and `api/.ai/verification/`, inside the repo that owns the spec. Alex can commit them with the spec or keep them local, and a teammate can resume from the same files. The `web/` gate results for tasks 3 and 4 are recorded in the same `api/.ai/verification/` folder, because the session started there. Starting at the workspace root would put them in the untracked root `.ai/` instead, and `/execute-task` would not find the spec at all (F2). See [docs/multi-repo.md](../../reference/multi-repo.md#configuration-traps).

## 5. Next morning: resume in a fresh session

On 2026-10-24, Alex opens a fresh Claude Code session in `api/`, the same way as the day before, and continues from the saved state:

```bash
cd ~/work/hireboard/api
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../web
```

```
/execute-task --spec=HIRE-5 --continue
```

```text
(simulated)
Resuming Spec: Candidate profiles (spec-HIRE-5-candidate-profiles)
Progress: 2/4 tasks complete (50%)
Last activity: 15 hours ago
Last completed: Task 2 (Show and upsert endpoints with policy and tests)
Resume hint: "Tasks 1-2 done in api/ (profile API green). Next: task 3 in web/ -
              types/api/profiles.ts, lib/api/profiles.ts, saveProfileAction"

Next Task: Task 3 - Types, fetchers and saveProfileAction (nextjs)

Ready to continue? [Yes] [Show task details] [Start over]
```

### Task 3: the web data layer

```text
(simulated)
Current Task: 3. Types, fetchers and saveProfileAction (nextjs)
Type: frontend -> loading web/CLAUDE.md conventions, lib/api/client.ts, types/api/common.ts

  web/types/api/profiles.ts          CandidateProfile, CandidateProfileInput (mirror the API shape)
  web/lib/api/endpoints.ts           + showMyProfile, upsertMyProfile
  web/lib/api/profiles.ts            getMyProfile() -> null on profile_not_found; saveMyProfile(input)
  web/app/(account)/profile/actions.ts
                                     saveProfileAction: 422 errors -> fields ("skills.1" -> skills),
                                     401 -> redirect('/login?next=/profile')

Verification Gates (web/): npm run lint PASS, npx tsc --noEmit PASS, npm test 3/3 PASS
Task 3 COMPLETE. Report: .ai/verification/spec-HIRE-5-candidate-profiles/task-3-20261024-0920.md
Next: Task 4 - /profile page and ProfileForm (nextjs)
```

The API reports item errors such as `skills.1` for the second skill, but the form has a single comma-separated skills input. The action folds item errors onto their field ([`actions.ts`](artifacts/web/app/(account)/profile/actions.ts)):

```ts
for (const [key, messages] of Object.entries(errors ?? {})) {
  const field = key.split('.')[0] as ProfileField;
  if (FIELDS.includes(field) && fieldErrors[field] === undefined && messages.length > 0) {
    fieldErrors[field] = messages[0];
  }
}
```

`getMyProfile()` in [`lib/api/profiles.ts`](artifacts/web/lib/api/profiles.ts) imports `server-only` and reads the token from the `hireboard_session` cookie on the Next.js server, so the browser never sees it (INV-05, [ADR-0001](artifacts/api/docs/adr/0001-spa-auth.md)).

### Task 4: the page

Alex runs the same command again:

```
/execute-task --spec=HIRE-5
```

```text
(simulated)
Current Task: 4. /profile page and ProfileForm (nextjs)
  web/app/(account)/profile/page.tsx   requireUser(['candidate']), dynamic = 'force-dynamic'
  web/components/profile-form.tsx      useActionState(saveProfileAction), field errors, "Profile saved"
Verification Gates (web/): lint PASS, tsc PASS, npm test 3/3 PASS, npm run build PASS (new route /profile)
Task 4 COMPLETE. Report: .ai/verification/spec-HIRE-5-candidate-profiles/task-4-20261024-1015.md
```

The page is small, because `requireUser` and the `(account)` layout (chapter 04) handle access and navigation:

```tsx
// app/(account)/profile/page.tsx
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  await requireUser(['candidate']);
  const profile = await getMyProfile();
  // heading, "You need a profile before you can apply" note when profile is null
  return <ProfileForm profile={profile} />;
}
```

The form ([`components/profile-form.tsx`](artifacts/web/components/profile-form.tsx)) keeps the values returned by the action in its state. React 19 resets an uncontrolled form after the action runs, and the inputs reset to those saved values instead of going blank.

Before execute-task closes the spec, Alex runs the one manual row himself, step 4.4 in `tasks.md`. Signed in as `candidate@hireboard.test`, the empty form and the note appear. He saves "Backend developer" with skills "PHP, Laravel" and 4 years, sees "Profile saved", reloads and finds the values pre-filled. Then he enters skills "PHP, php" and gets an error under Skills, with nothing saved. Signed in as `employer@acme.test`, `/profile` sends him away. The Done-when block counts a manual step only once someone has run it.

```text
(simulated)
No remaining tasks.
Traceability: 8/8 rows verified (7 by tests, AC-6 by tasks.md step 4.4)
Gates: api green, web green
spec-lite.md status: in-progress -> done
ALL TASKS COMPLETE
```

### Other ways to drive the same tasks

| You want | Type |
|---|---|
| Run the remaining tasks back to back and stop on the first failed gate | `/execute-task --spec=HIRE-5 --auto-continue` |
| Leave it unattended until the whole spec is green (built-in `/goal`, then continue) | `/goal every task in .ai/specs/spec-HIRE-5-candidate-profiles/tasks.md is checked and the verification gates pass`, then `/execute-task --spec=HIRE-5 --continue` |
| Re-check a finished spec without changing code (after a rebase, say) | `/execute-task --spec=HIRE-5 --verify-only` |
| Redo one task | `/execute-task --spec=HIRE-5 --task=3` |

`--auto-continue` stays inside one session and stops at the first red gate. `/goal` keeps Claude working until the condition holds, so give it a condition you can check (checked boxes and green gates), not "make it good".

## 6. Where things stand: /progress

`/progress` reads `./.ai/specs/*/tasks.md`, so it also depends on the working directory. The root has no specs, and until HIRE-7 (chapter 08) every spec lives in `api/`. Alex runs it there:

```bash
cd ~/work/hireboard/api && claude
```

```
/progress
```

```text
(simulated)
Progress Dashboard  (api/.ai/specs)

Active Specs: 0       Total Tasks: 17       Completed: 17 (100%)

ID                               Name                           Progress           Status
spec-HIRE-3-accounts-and-roles   Accounts and roles             ██████████ 6/6     done
spec-HIRE-4-company-reviews      Company reviews with moderation ██████████ 7/7    done
spec-HIRE-5-candidate-profiles   Candidate profiles             ██████████ 4/4     done

Next: no open spec tasks. Unmerged branches: feature/HIRE-5-candidate-profiles
```

Once `web/.ai/specs/` has specs (chapter 08), run `/progress` in `web/` as well. `/progress --spec=HIRE-5 --detailed` shows per-task files and tests.

A spec is `done` when the `tasks.md` Done-when block holds: every task is checked, every Traceability row has a passing test or a manual step that was run, and the gates are green. `execute-task` checks exactly that before it flips `status`.

## 7. Before the PRs: what you skipped, and a quick review

Compared with `ship-feature` ([chapter 05](05-feature-company-reviews-full-spec.md)), this run had no **Converge** (code-versus-spec gap audit), no **Visual** check, no **Review** panel with refutation votes, no **Acceptance** re-walk, no **Docs** update, and no **TestPlan** `manual-test.md`. You traded those for control and a resumable rhythm. So add a review yourself before opening the PRs. The kit's skill maps "after `/execute-task` completes" to the default adversarial `/deep-review`, and a profile is personal data under BR-21, so Alex does not settle for the critical-only `--depth=quick` here. The changes are still uncommitted, so he stages them and reviews each repo. `--staged` needs a git repo, so these sessions start inside the repos.

```bash
cd ~/work/hireboard/api && git add -A && claude
```

```
/deep-review --staged
```

```bash
cd ~/work/hireboard/web && git add -A && claude
```

```
/deep-review --staged
```

```text
(simulated)
api/: depth adversarial (different model tier). Scope touches personal data, so security-auditor
      ran in parallel and its findings were merged.
      Verdict APPROVED. 0 critical, 0 major, 1 minor (note: bio is not length-capped in the
      factory). Report: .ai/reviews/REVIEW-staged-20261024-104012.md
web/: depth adversarial. Verdict APPROVED. 0 critical, 0 major.
      Report: .ai/reviews/REVIEW-staged-20261024-104537.md
```

If you had committed task by task, review the branch instead: `/deep-review --depth=standard --branch=feature/HIRE-5-candidate-profiles --base=main`. Reserve `--depth=quick` for a small change where you want a fast safety net. A real finding and its fix are in [chapter 07](07-applications-and-deep-review.md).

Commit and open one PR per repo, and merge api first, since the change is additive ([docs/multi-repo.md](../../reference/multi-repo.md#process)):

```bash
git -C api commit -m "feat(profiles): candidate profile API (HIRE-5)"
git -C web commit -m "feat(profiles): candidate profile page (HIRE-5)"
git -C api push -u origin feature/HIRE-5-candidate-profiles
git -C web push -u origin feature/HIRE-5-candidate-profiles
```

Both PRs are merged that morning, `api` first. Chapter 07 builds on a merged HIRE-5.

## What you have now

- A private candidate profile: `GET/PUT /api/v1/me/profile` with 7 Pest tests, and a `/profile` page for candidates. This is the prerequisite HIRE-6 checks with `profile_required`.
- A spec, `spec-HIRE-5-candidate-profiles`, that went draft → approved (Approve only) → in-progress → done, with every AC and MNC traced to a test or a manual step that was run.
- The task-by-task loop and its files: `.ai/session/<spec>-state.json` with a `resume_hint` that names the next repo, per-task reports in `.ai/verification/<spec>/`, and why they land in `api/.ai/` when you start Claude inside the owning repo.

Next: [07 — Job applications with ship-feature, then /deep-review before merge (HIRE-6)](07-applications-and-deep-review.md)
