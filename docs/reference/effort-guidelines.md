# Effort, models and recovery

Use enough investigation and independent verification for the risk of the change. SDD Kit shares workflow phases and agent roles across Claude Code and Codex; the host controls model availability, concurrency and usage accounting. Agent counts and time estimates are planning aids, not completion criteria.

## Choose the smallest suitable route

| Work | Starting point | Verification |
| --- | --- | --- |
| A clear, small edit | `simple-task`, or the trivial route in `sdd` | Checks appropriate to the affected behavior |
| Existing behavior is wrong | `sdd` bug route → `fix-bug` | Reproduction, failing regression test, must-not-change guards, gates, acceptance |
| New behavior | `sdd` feature route → spec → human approval → `ship-feature` | AC/MNC traceability, implementation gates, independent review and acceptance |
| A technology choice | `sdd` decision route → `tech-research` | Sources, fit with the repository, adversarial verification, human decision |
| An approved spec over several sessions | `execute-task` | Task-level tests and gates, saved resume state |

In Claude Code, invoke `/sdd-kit:sdd` in plugin mode or `/sdd` in file-copy mode. In Codex, invoke `$sdd`. Direct skills follow the same convention, for example `/sdd-kit:execute-task` and `$execute-task`.

Parallelize only independent work. Give every worker a bounded assignment, ownership of files, relevant instructions and a required result. Independent review uses a fresh context. A workflow phase may need several sequential workers even when the host has few concurrent slots; do not remove phases to fit the slot limit.

## Model tier selection

The shared workflows express three tiers in their `MODEL_TIERS` / `phaseModels` definitions. The shipped definitions are in [the workflow registry](../../plugins/sdd-kit/workflows/lib/stacks.js); the source-authoring generator belongs to the upstream source project, not this distribution checkout.

| Tier | Shared intent | Claude Code default | Codex default |
| --- | --- | --- | --- |
| `deep` | Investigation, architecture, specifications, adversarial review, acceptance | `opus`, high effort | Inherit the active Codex model |
| `standard` | Implementation, fixes, gates and verification votes | `sonnet`, medium effort | Inherit the active Codex model |
| `light` | Inventory and mechanical work | `haiku`, low effort | Inherit the active Codex model |

These are host-specific defaults, not model equivalences. The Codex bridge strips Claude aliases from native job hints. Use only a real Codex model identifier supported by your host when explicitly supplying a model mapping. The host must support the requested effort; its permissions and available concurrency still apply.

For Claude, a workflow's `args.models` can override one or more tiers:

```js
Workflow({
  name: "ship-feature",
  args: {
    spec: "PROJ-123",
    models: { standard: { model: "<supported Claude model id>", effort: "high" } }
  }
})
```

For Codex, ask `$sdd-runtime` to use the supported Codex model mapping you specify for the run. Do not copy Claude model names into a Codex request. Keep default inheritance unless a measured evaluation justifies an override. Model availability, price and context limits come from the host and provider; the kit does not guarantee them.

## Budgets and context

| Mechanism | Claude Code | Codex |
| --- | --- | --- |
| Workflow token accounting | The workflow uses the host budget API when available | Reliable per-job native token counters are unavailable; the adapter preserves the source's no-explicit-budget branch |
| Execution bounds | Host/runtime limits | Separate `maxActive` and `maxJobs` limits in the bridge, plus native host limits |
| Read-volume hook | `CLAUDE_CONTEXT_USAGE` and `CLAUDE_BUDGET_THRESHOLD` (default 75%) | Adapter uses `SDD_CONTEXT_USAGE` and `SDD_CONTEXT_THRESHOLD`; without a usage hint it is not an automatic token meter |
| Model identity in a report | Host-provided evidence | Do not invent identities or usage totals the host did not expose |

The read-volume guard always rejects `find /`. Threshold-based restrictions depend on the supplied context-usage hint. A hook being packaged is not proof that the host has enabled and trusted it. See [hooks](../../share/hooks/README.md).

Reduce avoidable context: return findings and evidence instead of whole logs, load relevant skills and rule files, and keep checkpoints short. There is no universal token multiplier or reliable wall-clock estimate for a multi-agent run. Measure your own usage and compare quality on representative tasks.

## Checkpoints and recovery

| State | Location | Use |
| --- | --- | --- |
| Shared task progress | `.ai/specs/<spec-folder>/tasks.md` | The human-readable plan and completed tasks |
| `execute-task` resume state | `.ai/session/<spec-folder>-state.json` | Task cursor and `resume_hint` |
| Task gate evidence | `.ai/verification/<spec-folder>/` | Actual check results |
| Codex workflow receipts | `.ai/codex-workflows/` | Run id, ownership, claimed jobs and validated results |
| Codex project role memory | `.ai/agents/<role>.md` | Validated project context, subject to user memory preferences |

Save decisions, changed files, completed checks, unresolved risks and the next action before a context reset. Do not mark work done solely because it appears in a checkpoint.

For direct task execution, continue with `/execute-task --spec=PROJ-123 --continue` (Claude file-copy shorthand) or `$execute-task --spec=PROJ-123 --continue` (Codex). For an interrupted **Codex workflow**, retain the original run id and use the runtime's resume/reconnect path. Completed receipts are replayed; uncertain claimed work must reconnect to its original worker or be explicitly stopped. Starting a new workflow is not a safe substitute for reconnecting.

Finish active Codex runs before rebuilding or updating the plugin. Resume requires the original build, unchanged workflow source and current stack-trust snapshot. Read [Codex recovery](../hosts/codex.md) before changing a running installation.

## Sources and related pages

- [Native runtime: roles, accounting and job hints](../../adapters/codex/runtime/engine.mjs)
- [Provider mapping and completion review](../../adapters/codex/skill-overlays/sdd-runtime/SKILL.md)
- [Hook adapter: context-usage mapping](../../adapters/codex/hooks/dispatch.mjs)
- [Agent index](agents.md), [specification system](specification-system.md), [usage examples](usage-examples.md)
