---
name: sdd-codex
description: Run SDD Kit's fixed specification, implementation, bug-fix, research and QA pipelines through the local workflow bridge and native Codex subagents. Use when the user requests SDD Kit or an SDD workflow in Codex.
---

# Native SDD Kit

Use the bundled SDD workflow bridge tools and Codex's native subagents. Read the bundled `sdd` skill for routing, required inputs, specification approval, and completion criteria. The original workflow scripts determine the phases and gates.

## Provider mapping

The bundled upstream instructions use these notations. Apply this mapping consistently, including references loaded later:

- `Workflow({name,args})`: call `workflow_start`, then drive the jobs below until terminal status. It is not complete when merely started.
- `Skill(name,args)` and `/name`: read the corresponding installed skill and follow it with those arguments. Find its actual installed path in the skills catalog.
- `AskUserQuestion`: use the native user-input tool or ask the user in chat. An unanswered question is not approval.
- `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit`: use available native file, search, shell and patch tools. Respect the role's declared restrictions.
- `ToolSearch`: discover connected tools through the host. Use available Playwright tools or the host's browser interface; missing browser evidence means not run.
- `${CLAUDE_SKILL_DIR}` in an upstream skill: resolve to that skill's actual installed directory. Do not assume it is a shell environment variable.
- Claude's model aliases `opus`, `sonnet`, `haiku`: inherit the current Codex model unless the user has supplied an explicit Codex model mapping. Do not send those aliases to Codex.

The plugin is a compatibility preview. Consult `references/compatibility.md` before relying on parity. Do not run Claude, nested `codex exec`, the original Claude installer, or Claude-specific settings commands.

## Drive a workflow

1. Collect all inputs and complete the original approval steps. For `ship-feature`, use an explicitly approved spec. Do not set `allowDraft` automatically.
2. Call `workflow_start` with the absolute workspace root, exact workflow name and arguments. Retain its run id. Save it in your handoff so a later chat can resume it.
3. Claim queued jobs with `workflow_claim`, up to the bridge's concurrency cap and the host's available slots. Keep the job id and claim token in the parent.
4. Spawn a fresh native subagent for each claimed job. Pass the workspace, full `role.instructions`, declared tool restrictions, preload skill names, complete job prompt and result schema. Also pass the provider mapping above. Tell workers they share the workspace and must not revert others' changes. Do not fork the parent's conversation into independent review jobs.
5. Wait for the native workers. Check each actual result and its evidence against the assignment. If work is incomplete, continue that worker to resolve the concrete gap before submitting. Never fabricate tests or silently coerce a failed result into success. Use a fresh native reviewer when the original role or workflow requests independent review.
6. Submit the worker's JSON value with `workflow_submit` (a string for prose-only steps without a schema). If schema validation fails, return the error to that worker for repair; do not invent required fields. Repeated failure ends with `workflow_stop` and the specific reason.
7. Continue until `completed`, `failed`, or `cancelled`. `completed` means the script returned; inspect its result for blocked gates, unresolved acceptance, incomplete tasks and errors before reporting success.
8. Before claiming verified completion, have a fresh native reviewer check the final claim against the actual recorded evidence. This is the explicit replacement for the unsupported prompt-based Stop hook.

## Interruption and recovery

Interrupt active native workers before stopping a run. Call `workflow_stop` with the reason. Do not abandon claimed jobs silently.

After an MCP restart, call `workflow_resume` with the original workspace and run id. Completed results are replayed, while claimed jobs remain claimed. Reconnect to their original native workers. If those workers cannot be recovered, stop and report the uncertain partial work; do not repeat potentially mutating jobs automatically.

## Stack discovery

The preview currently preserves upstream stack discovery and trust semantics. Use only built-in first-party stack data unless the required discovery/trust path has been verified for the target project. Do not bypass an untrusted-manifest result or claim that unavailable Claude plugin discovery succeeded. Custom stack migration is an outstanding compatibility gate, detailed in the reference.
