# One SDD Kit, two hosts

SDD Kit defines its development process once and adapts the host interfaces at the edge. Claude Code and Codex share workflow scripts, skills, roles, templates, stack manifests and guards. The repository root owns installation entry points, dependencies, builds, tests and release identity.

## Source ownership

| Path | Responsibility |
| --- | --- |
| `plugins/sdd-kit/workflows/` | Canonical workflow phases, schemas and machine outcomes |
| `plugins/*/skills/`, `plugins/*/agents/` | Shared instructions and specialist roles |
| `plugins/*/stack.json`, add-on resources | Stack detection, gate recipes, rules and templates |
| `share/` | Shared project templates, installer resources and configuration examples |
| `cli/`, `scripts/build.mjs`, `scripts/install-host.mjs` | Common entry points, host selection and packaging |
| `adapters/claude/` | Preserve and package the canonical Claude marketplace |
| `adapters/codex/` | Native workflow transport, stack storage, hook payloads and focused skill overlays |
| `docs/**/*.md` | User-facing reference, host setup and example narrative |
| `docs/guide-data.js`, `docs/host-data.js` | Interactive guide's shared copy and explicit host variants |
| `scripts/build-docs.mjs` | Render Markdown pages and source-derived catalog |
| `tests/` | Shared host contracts, adapter regression tests and documentation checks |
| `dist/` | Disposable generated installable packages |

Change shared behavior in `plugins/` or `share/`. Add adapter behavior only when a host API actually differs. Never maintain an independent fork of the workflow phase definitions under an adapter, or treat generated `dist/` files as editable source.

## Build and installation boundaries

`node cli/sdd-kit.mjs build --host all` builds both packages. `--host claude` and `--host codex` select one. `npm test` rebuilds packages before running root and native tests.

The Claude builder copies the marketplace, plugins and shared resources into `dist/claude` without changing their content. The existing marketplace and `install.sh` remain valid. The common CLI's default install route is Claude file copy; `--host claude` makes that choice explicit and forwards installer flags.

The Codex builder creates `dist/codex` as a native marketplace with `plugins/sdd-kit/`. It bundles shared sources for provenance, converts host-facing skill frontmatter and paths, includes all first-party skill add-ons, and supplies a native runtime skill plus overlays for stack trust, scaffolding and diagnosis. `install --host codex` builds, registers that marketplace and installs `sdd-kit@sdd-kit`. Its flags are separate from Claude's file-copy flags.

Source: `cli/sdd-kit.mjs:117`, `scripts/build.mjs:10`, `scripts/install-host.mjs:7`, `adapters/claude/build.mjs:5`, `adapters/codex/build.mjs:29`.

## Runtime ownership

Claude runs the canonical workflows using its native `Workflow` and `Agent` facilities. Codex cannot call those APIs directly. Its local MCP bridge interprets the shipped, allowlisted workflow scripts with native equivalents for host primitives. It does not evaluate project-supplied workflow JavaScript, launch Claude or run a second model client.

The parent Codex agent claims a job, obtains the declared role instructions, delegates to a native subagent and submits the real result. The bridge validates the result before advancing. Phase order, output schemas and source outcomes remain in the canonical workflows.

Native completion review independently checks the report against evidence. It cannot turn a blocked source result into success. Per-job token counters are unavailable; model aliases and effort hints do not establish equal behavior across providers. Read the host contract alongside any parity claim.

For greenfield work, the shared workflow also distinguishes a sound architecture plan from its implementation. Full decisions constrain scaffolding, the selected local or hosted CI, and the first slice. Acceptance requires one passing evidence-backed check per decision and a successful journey without broken links; its computed recommendation governs the report and backlog status in both hosts. See [the new-app contract](https://github.com/BODYA7979/sdd-kit/blob/main/docs/reference/usage-examples.md#5-new-app) and `plugins/sdd-kit/workflows/greenfield-build.js:2451`.

The shared/native contract is implemented in `adapters/codex/runtime/engine.mjs`, `adapters/codex/runtime/server.mjs` and `adapters/codex/skill-overlays/sdd-runtime/SKILL.md`.

## Project context and recovery

Share specifications, task lists and context documents across hosts. Keep business rules and exact commands in `AGENTS.md`; Claude's `CLAUDE.md` imports them. Host settings, rule-loading mechanisms and trust stores differ.

Codex run receipts live under the application project's `.ai/codex-workflows/`. Recovery validates the original build, workflow source, ownership and trust snapshot, and reconnects original workers. Completed receipts may replay; uncertain edits must not be redispatched. Finish or stop active runs before replacing their plugin build. A spec can move between hosts; an active runtime cannot.

Hook definitions are not equivalent to execution evidence. Native hooks depend on supported events and exact-definition trust; patch guards do not cover arbitrary shell writes. Browser checks require a real browser scenario, not only MCP discovery.

## Documentation ownership

Keep shared process explanations in reference pages and operational host differences in dedicated host guides. The interactive selector changes explicit examples; it must not invent commands by replacing every slash with a dollar sign. Static Markdown remains readable with both labeled forms.

The documentation builder renders Markdown to adjacent HTML, derives catalog entries from shared sources and checks local links. Generated HTML and catalog data should be rebuilt together with their sources. Historical worked-example artifacts and validation records retain their evidence dates; rendering them is not re-running them.

See [maintaining the documentation](https://github.com/BODYA7979/sdd-kit/blob/main/docs/maintaining-docs.md) for commands and source/output ownership.

## Upstream integration

This checkout started from the public 3.1.0 distribution. The original author's release pipeline generates that distribution from a separate source repository. No private source was used, and this fork does not claim to have changed that pipeline.

The original upstream `v3.1.0` tag and this fork's host-enabled revision are different delivery points. An upstream contribution must integrate root entry points, adapters and documentation generation into the author's source/release pipeline so a later generation retains them. Shared source ownership and byte-preserving Claude packaging make that boundary explicit.

## Evidence

The [validation record](https://github.com/BODYA7979/sdd-kit/blob/main/docs/validation.md) distinguishes automated packaging/runtime checks from native fixture scenarios and unverified production/browser behavior. Passing one layer is not proof of the others.
