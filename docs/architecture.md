# One SDD Kit, two hosts

The repository root owns installation, builds, dependencies, tests and release identity. `plugins/` and `share/` are the authoritative behavior and resource definitions. Both hosts consume those files; there is no second editable copy of the workflows or the 61 skill definitions.

| Path | Responsibility |
| --- | --- |
| `plugins/`, `share/` | Shared workflows, skills, agents, stack manifests, templates and original guards |
| `cli/`, `scripts/` | Common entry points; host selection and packaging |
| `adapters/claude/` | Package the existing Claude marketplace without rewriting its files |
| `adapters/codex/` | Native job transport, stack storage, hook payloads and narrowly scoped skill overlays |
| `tests/` | Shared host contract and adapter regression tests |
| `dist/` | Generated installable packages, never an authoritative source |

Claude's existing marketplace and `install.sh` remain valid. The common CLI defaults to the existing Claude file-copy installer, forwarding its flags unchanged. `--host codex` builds and installs a native Codex plugin with the same `sdd-kit` identity and root version.

Codex cannot execute Claude's `Workflow` and `Agent` APIs directly. Its adapter interprets the shipped, allowlisted workflow scripts with native equivalents for their host primitives. It never evaluates project-supplied workflow JavaScript or launches another model process. The parent Codex agent owns delegation to native subagents. JSON schemas, phase order and source outcome decisions stay in the shared workflows.

Provider-specific overlays cover workflow routing, native stack trust/scaffolding and environment diagnosis. Build-time formatting converts skill frontmatter and host paths while retaining original sources in the artifact. An additional independent completion review verifies final claims; it cannot turn a blocked source result into success.

## Upstream integration

This checkout started from the public 3.1.0 distribution. Its original release pipeline generates that distribution from the author's separate source repository. No private source was used. A future upstream contribution must integrate these root entry points and adapters into that source/release pipeline so generation retains them. The shared source layout and unchanged Claude artifact make that integration explicit; this fork does not claim to have changed the author's pipeline.
