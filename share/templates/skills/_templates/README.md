# Skill template guide

Write reusable task instructions once, then use the host's supported packaging. SDD Kit keeps shared skill sources under `plugins/<plugin>/skills/<name>/`; its Codex adapter generates native metadata and applies narrowly scoped runtime overlays.

## Directory structure

```text
<skill-name>/
├── SKILL.md           name, description and core instructions
├── references/       detailed guidance loaded when needed
├── scripts/          helpers that actually exist and are tested
└── assets/           templates or output resources
```

| Location | Purpose |
| --- | --- |
| `plugins/<plugin>/skills/<name>/` | Author a shared SDD Kit skill |
| `.claude/skills/<name>/` | Claude project file-copy skill |
| `.agents/skills/<name>/` | Native project skill location used by the Codex stack scaffolder |
| `dist/` | Generated packages; do not edit these as source |

## Shared content and host metadata

Keep the shared description precise: what the skill does and when it applies. Separate business rules and steps from host-specific invocations. Use references for longer material and keep the main instructions focused.

A portable starting point is:

```yaml
---
name: billing-patterns
description: Apply the project's billing conventions when changing invoices, refunds or payment webhooks.
---
```

Claude supports additional fields such as `user-invocable`, `disable-model-invocation`, `allowed-tools`, `model`, `context`, `agent` and `argument-hint`. These describe **Claude behavior**, not a cross-host contract. For example, `disable-model-invocation: true` makes a Claude skill manual-only; the SDD Codex build maps it to `policy.allow_implicit_invocation: false` in `agents/openai.yaml`. The reverse visibility control, `user-invocable: false`, has no equivalent mapping in the current adapter.

The current Codex adapter emits name, description, optional license and upstream provenance metadata. It adds a provider-mapping preface and translates the kit's instruction paths. It maps the manual-only opt-out as described above but does not copy Claude model aliases or `allowed-tools` as native permission settings. Read [the build adapter](../../../../adapters/codex/build.mjs) before adding behavior that depends on metadata.

## Create and validate

1. Create a directory whose name matches the skill's `name`.
2. Start from `SKILL.template.md` in this directory for a Claude/shared source, or use the minimal metadata above for a native project skill. Review any template fields for the target host.
3. Write a specific description and task steps. State required inputs, boundaries, outputs and verification.
4. Move long references out of the entry file. Add only helpers that the skill calls and explain their inputs.
5. For shared SDD changes, build both hosts with `node cli/sdd-kit.mjs build --host all` and run `npm test`. Check the generated Codex skill as well as the Claude source.
6. Test discovery and an actual invocation in each intended host. A build check does not establish that a live host loaded a skill or enforced its permissions.

## Invocation and host primitives

| Need | Claude Code | Codex through SDD |
| --- | --- | --- |
| Invoke a skill | `/plugin:skill` or `/skill` in file-copy mode | `$skill` |
| Start a workflow | `Workflow({ name, args })` | `$sdd-runtime` drives the native bridge |
| Delegate a role | `Agent` | Load `agent_instructions`, then create a native subagent |
| Ask for input | Host question tool | Native question or chat input |
| Skill directory | `${CLAUDE_SKILL_DIR}` notation | Resolve `SDD_SKILL_DIR` from the installed skill path |
| Project instructions | `CLAUDE.md` and its imports | `AGENTS.md` and explicitly loaded matching rule files |

In Codex the directory notations are not pre-set shell environment variables. The [runtime provider mapping](../../../../adapters/codex/skill-overlays/sdd-runtime/SKILL.md) is authoritative for these translations.

Claude dynamic substitutions such as `$ARGUMENTS`, `${CLAUDE_SESSION_ID}` and shell preprocessing are host features. Do not assume they execute unchanged in Codex; provide equivalent explicit instructions or a host overlay and test it.

## Keep instructions economical

- Explain project conventions, not basic language syntax.
- Return concise findings with evidence instead of full transcripts.
- Read references only when they apply.
- Keep source facts and generated examples distinct.
- Put approval requirements in the task instructions as well as any host metadata that supports them.

Official Claude reference: [skills](https://code.claude.com/docs/en/skills). For native packaging, see [Codex support](../../../../docs/hosts/codex.md).
