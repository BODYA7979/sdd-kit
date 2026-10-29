# SDD Kit for native Codex — compatibility preview

This port runs the public SDD Kit 3.1.0 JavaScript workflows through a local MCP bridge. Native Codex subagents perform the work. No Claude process, nested `codex exec`, or direct model API client is used.

## Build and try locally

Requires Node 20+ and jq. From this directory:

```sh
npm ci --ignore-scripts
npm test
npm run build
codex plugin marketplace add ./dist
```

Select `sdd-kit-codex` from the local marketplace in the desktop app. Review and trust the packaged hook definitions, then start a fresh chat in a disposable test repository and invoke `$sdd-codex`. Installation does not itself establish parity or trust the hooks.

The build copies upstream resources and retains their licenses. Upstream files remain untouched. Generated files are under `codex/dist/` and are not committed. Rebuild after changing the upstream version or port code.

## Execution and recovery

The bridge emits schema-bearing jobs. The parent Codex agent claims jobs, delegates to native subagents, waits for actual results and submits their JSON. The same upstream JavaScript decides the next step. Results and pending claims live under `.ai/codex-workflows/` in the target workspace, with owner-only file permissions.

Restart replays completed job results without repeating them. It retains claimed jobs rather than reassigning potentially mutating work. Reconnect to the original worker or stop the run if its outcome is unknown. A changed workflow source hash prevents resume.

## Parity status

This is an implementation preview, not a release claiming identical behavior. See [the detailed compatibility matrix](skills/sdd-codex/references/compatibility.md).

Verified locally: all six original workflows reach their first native job; invalid result schemas and stale claims cannot advance a run; concurrent job limits, replay and patch normalization pass automated tests. A full research workflow returns the same result as upstream given the same scripted worker evidence, including rejecting unsupported claims. This is deterministic parity evidence, not a live model run. Real Codex plugin installation and full model-driven runs of all six workflows are still required.

## Tests

`npm test` runs dependency-free Node test runner tests; Ajv validates the original JSON Schemas. Synthetic cases do not establish implementation quality, live browser acceptance or production safety.

## Continuous integration

`.github/workflows/codex-compatibility.yml` builds the native package and runs the compatibility suite on pushes and pull requests.
