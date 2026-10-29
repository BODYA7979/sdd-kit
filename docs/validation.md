# Dual-host validation — 2026-10-29

This records bounded acceptance of the shared-root integration, not a guarantee that model-generated applications are correct or production-ready.

## Reproducible checks

- `npm ci --ignore-scripts` and root `npm test`: 51 passing tests on Node 22.17.1/macOS. GitHub Actions runs the same suite on Ubuntu/Node 22.
- Tests compare the Claude artifact and the native artifact's original resources byte-for-byte with canonical `plugins/`, `share/` and marketplace sources.
- Native tests cover all six workflow startups, schemas, concurrency, ownership and replay integrity, worker reconnect, report correction, native stacks/trust, scaffolding, lifecycle messages, multi-file and nested-repository hooks, role/rule resources, and MCP transport. Sixteen greenfield cases cover both host interfaces, decision propagation (including local-only CI), and rejection of missing, duplicated, invented or failed architecture checks.
- Root tests cover host routing, dependency hoisting, YAML frontmatter, shared identity and Node-selector validation before writes.
- `claude plugin validate`: marketplace plus all nine plugin packages pass. Five inherited descriptions required quoting; their text is unchanged.
- Codex skill validator: all 62 generated skills pass (61 shared skills plus the native runtime skill).
- Production dependency audit: zero known vulnerabilities at verification time.
- Packed npm archive installed into a separate consumer with hoisted dependencies; both host builds and native installation dry-run succeed. Dependencies are bundled from their resolved production closure, not an assumed package-local `node_modules`.
- Installed `sdd-kit@sdd-kit` is enabled; installed runtime/config/skill files match the final build. The installed MCP server initializes and exposes 11 tools.
- Context7 and Playwright MCP servers initialize and list their tools. This is transport discovery, not live browser acceptance.

## Native worker scenarios

Actual Codex subagents executed small dependency-free Node fixtures through the MCP adapter. No Claude model process, nested `codex exec`, deployment or external application writes were used. Independent completion reviewers checked the resulting claims against files and commands.

| Workflow | Observed result |
| --- | --- |
| create-spec | PASS: draft specification and tasks produced without implementation |
| ship-feature | PASS: feature implemented, tests and independent checks passed, spec completed |
| qa-and-docs | PASS: nine traceable QA cases and documentation; inferred acceptance explicitly distinguished |
| tech-research | PASS: official-source verification, comparison and Proposed ADR; human approval not implied |
| fix-bug | PASS: baseline reproduces two failures; six tests, lint and independent boundary/preservation checks pass after the fix |
| greenfield-build | PASS on the follow-up: completed with SHIP-SLICE, architectureImplemented=true and independent completion PASS. All eight architecture decisions, 143 tests, 134 independent CLI cases and safe imports were verified. The initial blocked run is retained as negative evidence below. |

All six workflow types now have a successful native-worker scenario. This does not mean the other five were rerun for the greenfield-only change.

The initial greenfield run passed 45 tests and 51 CLI probes but accepted radix prefixes contrary to its decimal-only architecture. Its report said FIX-FIRST while machine fields said SHIP-SLICE; completion review correctly blocked it. A tracked-file greenfield refusal and a misleading bug-fix report are also retained as negative cases.

## Greenfield follow-up

The shared workflow now passes full architectural decisions into scaffolding, CI, implementation and acceptance. Acceptance requires one evidence-backed check per decision and successful journey steps without broken links; the plan's validity and its actual implementation are separate fields. CI honors an explicitly local-only runner instead of unconditionally creating a hosted workflow. Sixteen regressions cover both original-host and native-host execution; the original omissions were reproduced before the fixes.

Run `e64dd4be-3c47-46f6-a54d-af2f8c6c6b68` started in a fresh empty Git repository and reached completed / SHIP-SLICE / PASS through actual native workers. No receipts from earlier runs were replayed into it. During acceptance it exposed the CI propagation omission: the initial CI step had created a hosted workflow despite a local-only design. The CI worker removed its own generated hosted file and committed the unchanged local runner; an independent reviewer repeated acceptance before its result was submitted. The initial failed pre-submission result and correction evidence were preserved, not relabeled as passing. The CI prompt correction was tested and reviewed separately while that live run continued.

Final evidence: lint and 143 tests passed, 134 independent subprocess cases checked exact bytes/statuses (including prohibited number forms), fresh imports passed side-effect checks, all eight decisions passed, and a separate completion reviewer reran local CI. The report accurately limits success to the local working tree: application changes remain uncommitted in this disposable fixture, future backlog items remain proposed, and no hosted execution, deployment or publication was claimed.

## Continuity and limits

The initial six scenario runs began with the installed adapter preview. A Codex cache update removed its old version during three runs. Their completed native-worker receipts were retained and submitted through normal schema-checked APIs into a stable shared-build snapshot; implementation jobs were not executed twice. Subsequent phases used fresh workers. This is live work plus recorded-result replay, not six uninterrupted runs against the final binary. A native project-instruction path correction (`CLAUDE.md` to `AGENTS.md`) was made transparently in the greenfield fixture and is covered in the final adapter regression suite. Final packaging, rules and selector changes were verified separately by tests and independent code review.

Raw transcripts and machine-local paths are retained in the local acceptance workspace rather than committed. Per-role model identities and token accounting differ between hosts. Hooks still require Codex's exact-definition trust review in a fresh session; unit/integration hook tests do not claim the desktop fired every hook. Browser/human acceptance and production deployment remain outside these fixtures.
