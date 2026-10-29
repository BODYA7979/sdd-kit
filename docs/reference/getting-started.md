# Your first session with SDD Kit

Use the same process in Claude Code or Codex: check the installation, supply project context, describe a task, approve the specification when needed, then verify the result. Complete the [installation guide](installation.md) first.

## New to the agent?

Claude Code and Codex read project files, propose changes and use tools under their host's permissions. SDD Kit adds a shared development process. It does not replace sign-in, host permission controls or your project's runtime setup.

Choose your [Claude Code](../hosts/claude.md) or [Codex](../hosts/codex.md) setup. The [host comparison](../hosts/compare.md) explains which features and commands differ.

| Term | Meaning |
| --- | --- |
| Skill | Instructions loaded for a task; invoked explicitly using the host's syntax |
| Subagent | A worker with its own context that performs an assigned job |
| Workflow | A fixed sequence of phases, workers and quality gates |
| Hook | A host event handler; execution depends on installation, support and trust |
| MCP server | A tool connection, such as browser automation or library documentation |
| Spec | A written definition of done, approved before a feature is built |

## Check the installation

Open a fresh agent session in your **application project root**. Use the command matching your installation:

| | Claude plugin | Claude file copy | Codex |
| --- | --- | --- | --- |
| Diagnose | `/sdd-kit:framework-doctor` | `/framework-doctor` | `$framework-doctor` |
| Begin work | `/sdd-kit:sdd PROJ-123` | `/sdd PROJ-123` | `$sdd PROJ-123` |

These are chat inputs, not terminal commands. The doctor reports specific checks and next actions. Fix a failed runtime or missing skill before starting. Inspect `/hooks`; in Codex review the exact definitions and distinguish trusted files from observed execution. No doctor can turn an unrun browser check into a pass.

## Project context

Put facts both agents need in **`AGENTS.md`**: what the application does, the source of truth for its stack, exact test/lint/build commands, architecture boundaries and actions that require human approval. Keep facts in one place and link detailed material.

For Claude Code, add a small `CLAUDE.md` that imports it:

```markdown
@AGENTS.md
```

Codex reads project `AGENTS.md` directly. It does not need a second copy of the project's business rules in a separate host file.

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Shared project facts, commands, constraints and links to required context |
| `CLAUDE.md` | Claude entry point importing `AGENTS.md`; only genuinely Claude-specific additions |
| `.claude/rules/*.md` | Claude path-scoped area conventions |
| `.codex/rules/*.md` | SDD's matching-area Markdown conventions for Codex; not Codex permission rules |
| `docs/context/business-rules.md` | Business behavior and invariants |
| `docs/context/architecture.md` | Modules, boundaries and technical decisions |
| `docs/api/api-contracts.md` | Request/response shapes and API errors |

Start from [`share/templates/AGENTS.template.md`](../../share/templates/AGENTS.template.md) and, for Claude, [`share/CLAUDE.template.md`](../../share/CLAUDE.template.md). They are templates, not facts about your application: remove placeholders, adapt host-specific wording and move any shared invariants into `AGENTS.md`. Merge with existing files instead of overwriting them. The Claude file-copy installer creates context when absent; either plugin installation leaves this to you.

Explicitly instruct both agents in `AGENTS.md` to read the relevant context documents before substantial work. Merely creating those documents does not automatically load them in every host. Copy only applicable area rules and adjust their path globs to your project.

### Existing application

Ask the installed `write-docs` skill to derive the three context documents from the code:

| Claude plugin | Claude file copy | Codex |
| --- | --- | --- |
| `/sdd-kit:write-docs --type=all` | `/write-docs --type=all` | `$write-docs --type=all` |

Review inferred business rules: the code shows current behavior, not necessarily intended behavior. If a wiki or document owns the rules, use `write-docs --import <file-or-url>` and resolve disagreements explicitly.

### New product

Use `product-brief` first: `/sdd-kit:product-brief`, `/product-brief` or `$product-brief`. It captures users, the problem, business rules and an ordered backlog. `sdd` then routes the first slice through the new-app workflow.

For separate repositories, prepare the [multi-repo workspace](multi-repo.md) and provide absolute backend/frontend paths.

## Your first task

Give `sdd` a ticket key or a plain description. The host-specific command table above provides the exact form.

1. **Confirm the route.** The kit distinguishes a small task, bug, decision, feature, shipped-code review or new application. It gathers the inputs the workflow needs. A connected tracker can supply ticket details; otherwise paste them.
2. **Review the plan for a feature.** A small, obvious change can use the simple-task path. Larger feature work produces a spec under `.ai/specs/` with `spec-lite.md` and `tasks.md` (plus supporting files when needed).
3. **Read the acceptance criteria and boundaries.** Check what must change, what must remain unchanged, the evidence required, and all unresolved questions.
4. **Approve explicitly.** Choose to approve and build, approve only, request changes, or keep the draft. Draft specs are not authorization to implement. Posting to a tracker is a separate action.
5. **Let the selected workflow run.** It follows the shared phases and verification gates. Claude uses its workflow runner; Codex's bridge delegates to native workers. Browser checks need actual browser evidence.
6. **Read the report.** Inspect failures, unresolved acceptance and manual checks. A completion status is not evidence that the change is safe to merge.

The [specification reference](specification-system.md) defines the files and approval fields. The [workflow examples](usage-examples.md) show the six pipelines with host-specific invocation.

### Bugs and decisions

A bug request includes reproduction steps, expected versus actual behavior and nearby behavior to preserve. The fix workflow should establish a failing regression before the change and verify the original scenario afterward. A missing reproduction or unavailable environment remains a limitation.

A technology decision uses the research route: current sources, tradeoffs and a proposed ADR. Research does not authorize implementation. These paths do not need a feature spec merely to get started.

## Build an approved spec task by task

For interactive implementation, write the spec, review it through `sdd` and choose **Approve only**, then invoke `execute-task`:

| Step | Claude plugin | Codex |
| --- | --- | --- |
| Draft | `/sdd-kit:write-spec <request>` | `$write-spec <request>` |
| Review/approve | `/sdd-kit:sdd <spec-id>` | `$sdd <spec-id>` |
| Build | `/sdd-kit:execute-task --spec=<id>` | `$execute-task --spec=<id>` |
| Resume | `/sdd-kit:execute-task --spec=<id> --continue` | `$execute-task --spec=<id> --continue` |

Claude file-copy mode omits the `sdd-kit:` prefix. `--auto-continue` runs remaining tasks until a failed gate or another required stop. It does not bypass approval or evidence requirements. Claude's `/goal` is a host facility, not a portable SDD command.

## Continue, check and finish

Use the same skill name with the appropriate host syntax:

| Need | Skill | What to inspect |
| --- | --- | --- |
| Where was I? | `progress` | Spec/task status and the next task; native Codex run activity when present |
| See the work | `spec-board` | Spec status, backlog and approval warnings |
| Check behavior | `run-tests` | The project's real gate results |
| Review changes | `deep-review` | Findings backed by files and evidence |
| Investigate a question | `investigate` | Sources, tradeoffs and recommendation |
| Open pull requests | `open-pr` | Spec traceability, scope and validation |
| Capture a lesson | `learn` | A verified finding and its durable guard |

Not every optional skill is in a Claude minimal/file-copy installation. Install the full core or relevant add-on when needed. Codex bundles first-party skills.

## Progress, memory and recovery

Specs and completed artifacts are on disk. A new chat can read them, but it does not automatically reconnect an active run. Record the current spec, unresolved work and verification evidence at handoff.

Claude memory follows Claude's host controls. Codex uses the native session plus project role memory under `.ai/agents/` when enabled. Neither memory system replaces project instructions or verified evidence.

For Codex, preserve the run id, original plugin build and original workers. Recover through the runtime's resume/reconnect operations; never delete active locks or repeat uncertain edits. See [Codex recovery](../hosts/codex.md#execution-and-recovery). Claude `/workflows` and Codex run ids are different runtime surfaces.

## Artifact locations

| Artifact | Location |
| --- | --- |
| Specifications and tasks | `.ai/specs/` |
| Business rules / architecture | `docs/context/` |
| API contracts | `docs/api/` |
| Schema documentation | `docs/schemas/` |
| Decision records | `docs/adr/` |
| Codex workflow receipts | `.ai/codex-workflows/` (runtime-local, excluded from Git) |

Consult each report for the exact output files; do not infer completion from a folder existing.

## Next steps

- [Hireboard worked example](../examples/job-board/README.md)
- [Host comparison](../hosts/compare.md)
- [Installation troubleshooting](installation.md#troubleshooting)
- [Skills](skills.md), [agents](agents.md) and [workflow examples](usage-examples.md)

Source checkpoints: [routing skill](../../plugins/sdd-kit/skills/sdd/SKILL.md), [shared context template](../../share/templates/AGENTS.template.md), [Claude context creation](../../install.sh#L899), [Codex provider mapping](../../adapters/codex/skill-overlays/sdd-runtime/SKILL.md#L10).
