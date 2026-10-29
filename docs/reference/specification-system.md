# Specification System

How specs are named, structured, approved, and executed. The authoring skill is `write-spec`; its templates (`references/spec-lite.template.md`, `references/tasks.template.md`) are the source of truth for file contents.

## Using the same spec in either host

Specs, acceptance criteria, approval fields and task files are shared artifacts. You do not need a second spec when you switch agent hosts.

| Action | Claude Code plugin | Codex |
| --- | --- | --- |
| Draft and route a feature | `/sdd-kit:sdd PROJ-123` | `$sdd PROJ-123` |
| Write a spec directly | `/sdd-kit:write-spec` | `$write-spec` |
| Build tasks interactively | `/sdd-kit:execute-task --spec=PROJ-123` | `$execute-task --spec=PROJ-123` |
| Resume direct task execution | `/sdd-kit:execute-task --spec=PROJ-123 --continue` | `$execute-task --spec=PROJ-123 --continue` |
| Inspect the board | `/sdd-kit:spec-board` | `$spec-board` |

The rest of this page uses bare skill names (`/write-spec`) as Claude file-copy shorthand. Codex runs the corresponding `$write-spec` skill. A workflow name such as `ship-feature` is routed through `$sdd` / `$sdd-runtime`, not a dollar-prefixed workflow skill.

Codex workflow receipts in `.ai/codex-workflows/` are separate from the shared spec and `execute-task` checkpoint. Switching hosts does not migrate an active workflow's ownership or claimed workers; finish or stop that run first. Approval does not transfer trust for host hooks or custom stack manifests.

## Principles

- **One spec = one ticket = one feature.** Split anything above ~12 tasks.
- **Proportional.** Size the work first; small work gets little or no markdown.
- **Readable cold.** A fresh-context clarity gate must find no open questions before approval.
- **Traceable.** Every acceptance criterion and must-not-change item maps to a test or a manual-test step.
- **Human-approved.** Nothing is built from a `draft` spec.

## Directory layout

```
.ai/
├── specs/
│   └── spec-PROJ-123-refund-guard/      # one folder per spec
│       ├── spec-lite.md                 # always (S/M/L)
│       ├── tasks.md                     # always (S/M/L)
│       ├── decisions.md                 # M/L, only with real decisions
│       ├── manual-test.md               # M/L, when there is a UI or user journey
│       ├── business-rules.md            # L, rules needing validation flagged
│       └── references.md                # L, sourced research
├── session/<spec-folder>-state.json     # execute-task resume state
└── verification/<spec-folder>/          # per-task gate reports
```

## Sizing (proportionality)

| Size | Signals | Spec |
|------|---------|------|
| XS | ≤ ~3 files, obvious change, no behavior contract at risk | none — `/simple-task`, or `/sdd` bug route |
| S | one area, 1–3 tasks, no schema/API change | spec-lite + tasks |
| M | several layers, 4–7 tasks, or schema/API change | + decisions, manual-test when needed |
| L | cross-cutting, multi-repo, 8+ tasks, new business rules | + business-rules, references when needed |

## Spec IDs and folder names

The spec id **is** the folder name. Never compute "highest number + 1" — parallel sessions produced duplicate numbers that way.

| Situation | Folder | Example |
|-----------|--------|---------|
| Ticket exists | `spec-<TICKET-KEY>-<slug>` (key case preserved, slug lowercase) | `spec-PROJ-123-refund-guard` |
| No ticket | `spec-<YYYYMMDD-HHMM>-<slug>` (time from `date +%Y%m%d-%H%M`) | `spec-20261018-1430-order-pdf-export` |
| Legacy (still valid) | `spec-NNNN-YYYY-MM-DD-slug`, `N-YYYY-MM-DD-slug` | `spec-0042-2026-06-11-order-pdf-export` |

Create the folder atomically — `mkdir` without `-p` fails if the folder exists; append `-2`, `-3`, …:

```bash
mkdir -p .ai/specs
DIR=".ai/specs/$BASE"; n=2
until mkdir "$DIR" 2>/dev/null; do DIR=".ai/specs/$BASE-$n"; n=$((n+1)); done
```

### Resolving a spec reference

Every tool that takes a spec (`/sdd`, `/write-spec --spec`, `/execute-task --spec`, `ship-feature {spec}`) accepts:

| Reference | Matches |
|-----------|---------|
| Full folder name or path | that folder |
| Number: `0042`, `spec-0042`, `14` | `spec-0042-*`, `14-*` (leading zeros ignored) |
| Ticket key: `PROJ-123` | `spec-PROJ-123-*` (case-insensitive) |
| Timestamp id: `20261018-1430` | `spec-20261018-1430-*` |

```bash
REF="${REF#.ai/specs/}"; REF="${REF%/}"; KEY="${REF#spec-}"
if [ -d ".ai/specs/$REF" ]; then echo ".ai/specs/$REF"
elif printf '%s' "$KEY" | grep -qE '^[0-9]+$'; then
  ls -d .ai/specs/*/ | grep -E "/(spec-)?0*$((10#$KEY))-"
else
  ls -d .ai/specs/*/ | grep -iE "/(spec-)?${KEY}-"
fi
```

More than one match (two specs for one ticket, legacy duplicate numbers) → list the candidates and ask; never pick one silently.

## spec-lite.md

Frontmatter:

```yaml
id: spec-PROJ-123-refund-guard
title: Refund guard for top-up orders
type: feature            # feature | bug | improvement | refactor
size: M                  # S | M | L
priority: P2
status: draft            # draft | approved | in-progress | done
ticket: PROJ-123
stakeholders: []
approved_by:
approved_at:
created: 2026-10-18
stacks: [<stack-key>, <stack-key>]
```

Sections, in order: **Summary · Context · Scope (in/out) · Must NOT change · Acceptance criteria · Quality attributes (optional, M/L) · Boundaries (Always / Ask first / Never) · Technical context · Decisions (optional) · Open questions · Dependencies**.

- **Acceptance criteria** — `AC-n`, written in EARS (`WHEN <trigger> THE SYSTEM SHALL <response>`) or Given/When/Then; one observable outcome each.
- **Must NOT change** — `MNC-n`, existing behavior that must stay identical. Mandatory for bugs and improvements, and the primary contract of a `refactor` spec (characterization tests are written first); fix-bug and ship-feature re-check these in Acceptance.
- **Quality attributes** — `NFR-n` for authorization per role, a p95 latency budget, a WCAG level, personal-data handling; each traced to a test like an AC.
- **Boundaries** — what the implementer may do freely, must ask about, and must never do.
- **Open questions** — written by the clarity gate; each must be answered or accepted before approval.

## tasks.md

- Task lines `- [ ] N. Title (stack)` with a `Covers: AC-1, MNC-2` line and a final `**Verify**:` subitem. Tools find the next task by the first unchecked `- [ ] N.`.
- A **Traceability** table: one row per AC and MNC → `Verified by` (test `file::name` or `manual-test.md#step-N`), kind, task.
- **Verification gates** — only the tooling detected in the project.
- Gap tasks added by ship-feature's Converge phase continue the numbering under `## Phase: Gaps (converge round N)`. They go at the end of tasks.md, or directly above the first unchecked gate when there is one; a gap that lands below that gate stops the round unbuilt.

- A **gate** is a task whose title text after `N. ` starts with `Gate:` (case-sensitive). Only the owner checks it, and no task at or after the first unchecked gate runs. `spec-lint --gates <spec>` prints `build: <N>. <title>` for each unchecked task before that gate, then `awaiting owner: <title>` and exits 3; with no unchecked gate it ends with `gates: clear` and exits 0. execute-task builds only the `build:` tasks, ship-feature applies the same rule to the tasks.md text, and both stop with `awaiting owner: <title>` when nothing before the gate is open, and stop without building when the check cannot run.

## Lifecycle

```
/write-spec ──► draft ──(clarity gate empty + human approves in /sdd)──► approved
                                   sets approved_by, approved_at
approved ──(ship-feature or /execute-task starts)──► in-progress ──(all tasks, gates, acceptance)──► done
```

- Only `/sdd` sets `approved`; it may offer to post the spec link to the ticket (asks first).
- ship-feature refuses `draft` specs; `/execute-task` warns and asks.
- Legacy specs without frontmatter are executed as-is.

## Execution

```bash
/sdd spec-PROJ-123-refund-guard            # approve → ship-feature (background)
/execute-task --spec=PROJ-123              # task by task, interactive
/execute-task --spec=PROJ-123 --continue   # resume after a context reset
```

The per-task loop is defined in the `execute-task` skill:

```
load session state → first unchecked task → load its context → RED (failing test carrying the task's AC ids)
→ GREEN → refactor → verification gates (code-quality) → check the task, update state and resume hint → next or pause
```

Gate reports go to `.ai/verification/<spec-folder>/`. Beyond the standard gates, check what the task type needs:

| Task type | Also verify |
|-----------|-------------|
| Database | migration runs, rolls back and re-runs; model attributes and relationships match the migration; the factory creates valid rows; `docs/schemas/{table}.md` matches |
| API | route registered; policy exists and is enforced; request validation defined; resource shapes the response; feature tests cover success, validation and authorization failures; `docs/api/api-contracts.md` updated |
| Service | contract bound in a service provider; DTOs in and out with strict types; unit tests pass |
| Frontend | page or component renders the contract's data; mutations re-check the session; unit tests (and a browser test for a journey) pass; the production build succeeds |

When all tasks are checked, `/open-pr --spec=<spec-folder>` opens the pull request.

## Spec lint

`node plugins/sdd-kit/skills/write-spec/scripts/spec-lint.mjs [--warn] [--verified] [--root <dir>] <spec-dir>` (installed copy: `skills/write-spec/scripts/spec-lint.mjs`) checks a spec folder with no model or network call. Each finding is `<file>:<line> <error|warning> <problem>. Fix: <fix>`; a clean folder prints `spec-lint: <dir> OK`. Exit 1 when a blocker is found, 0 otherwise, 2 on a usage error, 3 from `--gates` when tasks.md has an unchecked gate task. `/write-spec` runs it before the clarity gate, `/sdd` before asking for approval (the spec stays `draft` while blockers remain), and the original upstream release checks run it over their example specs. This checkout does not ship that upstream `verify.sh`; use the script path above for local validation.

**Blockers**: missing or empty Acceptance criteria; an AC with no `SHALL` and no `THEN`, or using a vague term; missing Must NOT change when `type` is bug, improvement or refactor; missing or empty Out of scope; empty `stakeholders` together with empty `approved_by`; an AC, MNC or NFR id absent from the Traceability table (all ids when tasks.md or the table is missing); an unchecked Open question when `status: approved`.

**Warnings**: an unchecked gate task; a top-level task with no `Covers:` line; a Traceability row whose Verified by cell holds no valid item, or an item matching no form below.

**Verified by grammar**: items separated by `;`, each one of `path` (one token, relative to the repo root), `path::exact test title` (no `;` or `::` in the title), `manual-test.md#step-N` (needs a `### Step N:` heading in manual-test.md), or a named check (an item starting with `verify `, or `gen-indexes --check`, `gen-stacks --check`, `gen-guide-example --check`, `gen-retired-hashes --check`). `--verified` turns a missing path, a title not found in its file by fixed-string search, or a missing step heading into a blocker, and skips named checks. `--warn` prints every finding as a warning and exits 0.

**Vague terms**: the closed `VAGUE_TERMS` list exported by the script, matched case-insensitively on word boundaries, skipping backtick spans and double-quoted spans: fast, quick, quickly, robust, scalable, user-friendly, intuitive, appropriate, appropriately, as needed, as appropriate, reasonable, reasonably, properly, efficient, efficiently, seamless, seamlessly, easy, easily, simple, simply, flexible, adequate, sufficient, optimal, graceful, gracefully.

Source: [write-spec](../../plugins/sdd-kit/skills/write-spec/SKILL.md), [execute-task](../../plugins/sdd-kit/skills/execute-task/SKILL.md), [spec lint](../../plugins/sdd-kit/skills/write-spec/scripts/spec-lint.mjs), [native runtime](../../adapters/codex/skill-overlays/sdd-runtime/SKILL.md).
