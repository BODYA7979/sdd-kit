# SDD Kit in Codex

SDD Kit shares its workflows, skills, agent roles, templates and stack manifests between Claude Code and Codex. The root CLI selects the host. Codex uses a local MCP workflow adapter and native subagents; it does not launch Claude, nested `codex exec`, or a separate model API client.

## Install from this checkout

Requires Node 20+, the Codex CLI with plugin support, bash and jq. From the repository root:

```sh
npm ci --ignore-scripts
node cli/sdd-kit.mjs install --host codex --dry-run
node cli/sdd-kit.mjs install --host codex
```

This builds `dist/codex`, registers it as the local `sdd-kit` marketplace and installs `sdd-kit@sdd-kit`. The root package can also be installed from a GitHub branch with npx. Until this change is upstream, use this fork/branch rather than the author's released tag.

If the host's default Node is older, pass `--node /absolute/path/to/node` to select Node 20+ for the packaged MCP servers and hooks without changing global Node settings. Keep this checkout available for marketplace updates. Rebuild and reinstall after changing its source. Finish active workflows before updating: Codex may remove an old version's cache directory.

Start a fresh Codex session, review the exact hook definitions with `/hooks`, and invoke `$sdd` (or `$sdd-runtime`). Installing does not automatically trust hooks. Hook safeguards require host trust and enabled hook support. The bundled native package includes all first-party skill add-ons; framework hooks apply only to matching projects. Claude retains its existing selective plugin installation.

## Shared development

```sh
npm test
node cli/sdd-kit.mjs build --host all
node cli/sdd-kit.mjs build --host claude
node cli/sdd-kit.mjs build --host codex
```

Edit shared behavior under `plugins/` and `share/`. Change `adapters/codex/` only for host API differences. Generated packages in `dist/` are disposable build output. See [the shared architecture](../architecture.md) and [the host contract](../../adapters/codex/skill-overlays/sdd-runtime/references/compatibility.md).

## Execution and recovery

The same six source JavaScript workflows choose phases, schemas and gates. The adapter emits jobs; the parent claims each job, delegates it to a fresh native subagent and submits its actual result. It validates results before advancing. An independent final review checks the reported outcome against evidence.

Run state lives in the target project's `.ai/codex-workflows/`, excluded from Git and written with owner-only permissions. After interruption, resume with the same plugin build and reconnect to original workers. Completed receipts are replayed without repeating edits. Uncertain claimed work is never redispatched automatically. Changed workflow source, adapter version or stack trust prevents unsafe resume. If an update removed the original build, restore that build before recovery; do not invent or edit saved receipts.

Custom stack discovery and exact-hash approval use native `.codex` paths. Creating a stack does not approve its commands. Project agent memory uses `.ai/agents/` and respects the user's memory preferences.

## Verification limits

Root tests cover both host packages, workflow startup, schema validation, ownership/recovery, blocked outcomes, native stacks, scaffold failures, lifecycle parsing, patch guards and the MCP transport. The Claude package is compared byte-for-byte with canonical sources. Native worker acceptance is recorded separately in the repository's validation notes.

Model identities, token accounting and host UI differ. Tests do not establish identical model answers, production safety, or live browser/hook behavior on every project. Browser checks require an actual available browser and are never counted as passed merely because the MCP server starts.
