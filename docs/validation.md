# Dual-host validation — 2026-10-29

This records bounded acceptance of the shared-root integration, not a guarantee that model-generated applications are correct or production-ready.

## Reproducible checks

- `npm ci --ignore-scripts` and root `npm test`: 35 passing tests on Node 22.17.1/macOS. GitHub Actions runs the same suite on Ubuntu/Node 22.
- Tests compare the Claude artifact and the native artifact's original resources byte-for-byte with canonical `plugins/`, `share/` and marketplace sources.
- Native tests cover all six workflow startups, schemas, concurrency, ownership and replay integrity, worker reconnect, report correction, native stacks/trust, scaffolding, lifecycle messages, multi-file and nested-repository hooks, role/rule resources, and MCP transport.
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
| greenfield-build | BLOCKED: 45 tests, lint and 51 CLI probes passed, but the generated app accepted radix-prefixed numbers despite its decimal-only architecture. The prose correctly recommended FIX-FIRST while source machine fields recommended shipping. The added independent reviewer rejected this contradiction; no successful implementation claim is made. |

Additional negative cases preserved a tracked-file greenfield refusal and rejected a misleading bug-fix report. The greenfield discrepancy is a model-produced fixture issue exposed by the completion gate, not evidence of a passing application.

## Continuity and limits

The runs began with the installed adapter preview. A Codex cache update removed its old version during three runs. Their completed native-worker receipts were retained and submitted through normal schema-checked APIs into a stable shared-build snapshot; implementation jobs were not executed twice. Subsequent phases used fresh workers. This is live work plus recorded-result replay, not six uninterrupted runs against the final binary. A native project-instruction path correction (`CLAUDE.md` to `AGENTS.md`) was made transparently in the greenfield fixture and is covered in the final adapter regression suite. Final packaging, rules and selector changes were verified separately by tests and independent code review.

Raw transcripts and machine-local paths are retained in the local acceptance workspace rather than committed. Per-role model identities and token accounting differ between hosts. Hooks still require Codex's exact-definition trust review in a fresh session; unit/integration hook tests do not claim the desktop fired every hook. Browser/human acceptance and production deployment remain outside these fixtures.
