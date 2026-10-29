# Multi-repo workspaces

Keep related repositories under one workspace so a single Claude Code or Codex session can follow the API contract, change each side and report each repository's checks. Give each repository its own Git history, instructions and tooling. The parent folder need not be a Git repository.

## Layout

```text
project/
├── AGENTS.md               shared workspace contract and repository map
├── CLAUDE.md               Claude entry point; imports AGENTS.md
├── api/                    Laravel API, own .git and AGENTS.md
│   └── CLAUDE.md           Claude entry point for this repository
└── web/                    Next.js, own .git and AGENTS.md
    └── CLAUDE.md           Claude entry point for this repository
```

Keep common project rules in `AGENTS.md`. Claude's `CLAUDE.md` can import it with `@AGENTS.md`. Write instructions to read each affected repository's own instructions before editing there. Codex should explicitly read nested repository instructions and applicable `.codex/rules/*.md`; do not assume Claude's `@file` import syntax or `/memory` command works in Codex.

The root instructions hold only cross-repository concerns: the authoritative API contract, a table of repository paths and dev URLs, the order of changes, and how to validate each side. Stack conventions stay in the repository they govern.

## Install and start

| Step | Claude Code | Codex |
| --- | --- | --- |
| Install the kit | Enable core + stack add-on plugins, or run the file-copy installer in each existing repository | Install the native package from a checkout containing Codex support; it bundles first-party add-ons |
| Configure project context | Use the [multi-repo template](../../share/templates/multi-repo/CLAUDE.md); import shared `AGENTS.md` and repository context | Write a root `AGENTS.md` with the repository map and explicit per-repository reading instructions |
| Start cross-repo work | Start Claude in the parent workspace | Open the parent workspace in Codex |
| Begin a task | `/sdd-kit:sdd PROJ-123` (plugin) or `/sdd PROJ-123` (file-copy) | `$sdd PROJ-123` |
| Review all specs | `/sdd-kit:spec-board api/.ai/specs web/.ai/specs` | `$spec-board api/.ai/specs web/.ai/specs` |

For a new app, leave the future `api/` and `web/` targets missing or empty until `greenfield-build` scaffolds them. Install the kit outside those targets. The [installation guide](installation.md) separates host setup from project scaffolding.

Do not run `install.sh` to configure Codex; it writes Claude-specific settings. Native Codex path-scoped Markdown rules are loaded by the SDD runtime and passed to workers, not automatically treated as Codex shell-permission rules.

## Workflows and specs

Use `sdd` to collect repository paths and dev URLs. Direct workflow arguments are shared:

```json
{
  "spec": "api/.ai/specs/spec-PROJ-123-checkout",
  "repos": [
    { "path": "api", "role": "backend" },
    { "path": "web", "role": "frontend", "url": "http://localhost:3000" },
    { "path": "admin", "role": "frontend", "url": "http://localhost:3001" }
  ]
}
```

In Claude Code, these are the `args` of `Workflow({ name: "ship-feature", args: … })`. In Codex, ask `$sdd-runtime` to run `ship-feature` with those arguments and the absolute parent workspace root. The parent agent drives the bridge's claim/delegate/submit cycle to completion. `Workflow(...)` is not a Codex terminal command.

One run supports zero or one backend and multiple frontends. Each frontend needs a distinct URL and its own browser evidence. Browser passes are sequential because they share a browser. A missing browser or unreachable URL is reported as not run, never as successful acceptance.

Keep one authoritative spec in the repository that owns the change and list every affected repository in its scope and task plan. Pass a path when a ticket key is ambiguous. Each repository's gates run in that repository; a failed or unavailable required gate blocks the overall result.

## Several frontends

For a customer site and admin app, keep separate paths, URLs, rule files and gate results. The Laravel contract-sync template is at [plugins/sdd-kit-laravel/templates/contract-sync](../../plugins/sdd-kit-laravel/templates/contract-sync/README.md). Copy its checker into project tooling and run it against each consumer in CI. Claude file-copy installations also stage the template under `.claude/templates/laravel/contract-sync/`; native Codex packages retain it under `source/plugins/sdd-kit-laravel/templates/contract-sync/`.

## Make the contract a sensor

A contract check can compare the API route list with a frontend registry or OpenAPI document. Generated frontend types can reduce hand-maintained mirrors. Neither check replaces behavior tests for authorization and mutations.

## Configuration traps

| Trap | Result and remedy |
| --- | --- |
| File access is mistaken for loaded instructions | Permission to read a sibling directory does not establish that its rules were read. Explicitly name each repository's instructions in the task. |
| Claude settings are copied into Codex | `.claude/settings.json`, `--add-dir` and `/memory` are Claude mechanisms. Use the native Codex workspace and runtime. |
| Root rules use repository-relative globs | A pattern such as `app/Http/**` is evaluated relative to a repository root. Keep rules with the repo and pass them to workers for that repo. |
| Each repo gets its own copy of the same spec | Task checkboxes and approval can diverge. Keep one spec and reference it from both sides. |
| A frontend is omitted because only API files changed | Search its API consumers and run its relevant checks before declaring the contract unchanged. |

For Claude-specific import and additional-directory behavior, consult the [official memory documentation](https://code.claude.com/docs/en/memory). Host capabilities evolve; an explicit instructions-and-paths handoff is easier to audit than relying on implicit sibling loading.

## Process

- For direct task execution, use `/execute-task --spec=<path> --continue` (Claude file-copy shorthand) or `$execute-task --spec=<path> --continue` (Codex).
- For a native Codex workflow, preserve its run id and reconnect original workers through `$sdd-runtime`. Do not repeat an uncertain claimed job in a new run. See [recovery](../hosts/codex.md).
- Commit separately in each repository. Use related branch names and link the PRs; `open-pr` supports one PR per changed repo, backend first.
- For additive API changes, merge the backend first. For breaking changes, add the new shape, migrate consumers, then remove the old shape.

Source: [shared workflows](../../plugins/sdd-kit/workflows/), [native provider mapping](../../adapters/codex/skill-overlays/sdd-runtime/SKILL.md), [rule and role loading](../../adapters/codex/runtime/engine.mjs).
