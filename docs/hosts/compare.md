# Claude Code and Codex: what changes

SDD Kit has one process and two host integrations. A **host** (also called a harness) is the application that gives the agent its tools, permissions, conversation and execution environment. Choose the host you use; you do not need both installed.

## Shared process

Both hosts use the source workflows, skills, roles, templates and stack manifests under `plugins/` and `share/`. They share `.ai/specs/`, acceptance criteria, task checklists and project documentation. A human approves feature specs and custom stack commands.

The adapter preserves source phase order and output schemas. This does not imply identical model answers, equivalent model tiers or identical permissions.

## Commands

| Task | Claude plugin | Claude file copy | Codex |
| --- | --- | --- | --- |
| Route work | `/sdd-kit:sdd PROJ-123` | `/sdd PROJ-123` | `$sdd PROJ-123` |
| Check installation | `/sdd-kit:framework-doctor` | `/framework-doctor` | `$framework-doctor` |
| Write a spec | `/sdd-kit:write-spec <request>` | `/write-spec <request>` | `$write-spec <request>` |
| Build an approved spec | `/sdd-kit:execute-task --spec=PROJ-123` | `/execute-task --spec=PROJ-123` | `$execute-task --spec=PROJ-123` |
| Review | `/sdd-kit:deep-review` | `/deep-review` | `$deep-review` |
| Progress | `/sdd-kit:progress` | `/progress` | `$progress` |
| Deploy (ops) | `/sdd-kit-ops:deploy` | `/deploy` | `$deploy` |

Type these in the agent's chat, not your shell. In Codex, select the installed skill from its picker when needed. Claude requires the relevant add-on; Codex bundles first-party skills.

`create-spec`, `ship-feature`, `fix-bug`, `qa-and-docs`, `tech-research` and `greenfield-build` are **workflow names**, not six additional Codex `$` skills. In Codex ask `$sdd-runtime` to run the named workflow, or let `$sdd` route it. Claude uses its native workflow runner. Host commands such as Claude's `/workflows`, `/plugin`, `/clear` and `/goal` are not portable SDD skills.

## Installation and runtime

| Area | Claude Code | Codex |
| --- | --- | --- |
| Package | Core plus selective marketplace add-ons; optional file copy | One generated plugin with all first-party skills |
| Installer | `install --host claude` routes to `install.sh` | `install --host codex` builds and registers `dist/codex` |
| Execution | Native `Workflow` and `Agent` primitives | Local `sdd-workflows` MCP bridge; parent delegates to native subagents |
| Instructions | `CLAUDE.md` imports shared `AGENTS.md` | Project `AGENTS.md` |
| Area rules | Project `.claude/rules/`; file-copy installer creates applicable rules | SDD loads bundled rules and project `.codex/rules/` for matching paths; these are Markdown instructions, not Codex permission rules |
| Custom stacks | `.claude/stacks/`, user stacks and installed add-ons | `.codex/stacks/`, user stacks and `.codex/stack-addons/` |
| Trust store | OS user's `.claude/sdd-kit/trusted-stacks.json` | OS user's `.codex/sdd-kit/trusted-stacks.json` |
| Hooks | Claude events and payloads | Native event/patch adapter; requires host support and review of exact definitions |
| Models | Claude role tiers and effort hints | Current Codex model unless the user supplies a Codex mapping |
| Token accounting | Claude-specific facilities | Per-job counters unavailable; separate job and concurrency caps apply |
| Recovery | Claude workflow/session facilities | `.ai/codex-workflows/` receipts; original build and worker reconnect |

## Working with both hosts

Keep commands, architecture rules and business invariants in one `AGENTS.md`; let `CLAUDE.md` import it. Put host setup in separate sections or small host files. Both agents can read the same specs and reports. Coordinate any concurrent edits.

A handoff shares a spec and completed evidence. It does not migrate active workers between hosts. Finish or explicitly stop the original run, inspect partial changes and start from the documented next step.

## Next steps

- [Install Claude Code support](claude.md)
- [Install Codex support](codex.md)
- [First session and project context](../reference/getting-started.md)
- [Validation limits](../validation.md)

Implementation sources: [host routing](../../cli/sdd-kit.mjs#L117), [native installer](../../scripts/install-host.mjs#L7), [Codex build](../../adapters/codex/build.mjs#L29) and [provider contract](../../adapters/codex/skill-overlays/sdd-runtime/SKILL.md#L10).
