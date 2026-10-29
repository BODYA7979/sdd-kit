# SDD Kit in Codex

SDD Kit uses a local MCP workflow bridge and **native Codex subagents**. It shares source workflows, skills, roles, templates and stack manifests with Claude Code. It does not launch Claude, nested `codex exec`, or a separate model API client.

## Requirements

- Codex installed and signed in, with a CLI exposing `codex plugin add` and `codex plugin marketplace`.
- Node 20+, npm, Git, bash and jq available to the host.
- A checkout containing `adapters/codex/`, `scripts/install-host.mjs` and the root CLI.
- Your application's runtime and services; a working browser for browser acceptance.

Check the CLI in your terminal with `codex plugin --help`. The kit's installer uses `plugin add`; if your Codex version does not expose it, update the host or use its supported plugin interface. Plugin UI and local-marketplace support can vary by client; see the [official plugin documentation](https://developers.openai.com/plugins/build/plugins).

## Install from this checkout

The original upstream `v3.1.0` tag predates the Codex adapter. Use a reviewed revision of this host-enabled fork, not that tag. If you do not have the checkout yet:

```sh
git clone https://github.com/BODYA7979/sdd-kit.git
cd sdd-kit
```

Select your team's reviewed revision before installing. Then, **from the kit repository root**:

```sh
npm ci --ignore-scripts
node cli/sdd-kit.mjs install --host codex --dry-run
node cli/sdd-kit.mjs install --host codex
```

The dry run prints the install plan without building or registering anything. The actual install:

1. Builds the native package in `dist/codex/plugins/sdd-kit` and a marketplace in `dist/codex`.
2. Registers that local marketplace with `codex plugin marketplace add`.
3. Installs `sdd-kit@sdd-kit` with `codex plugin add`.

Keep this checkout available for updates. Do not edit `dist/` as the source of truth; rebuilding replaces it.

If the host's default Node is older, select an absolute Node 20+ executable:

```sh
node cli/sdd-kit.mjs install --host codex --node /absolute/path/to/node
```

The selector is checked before build writes and used for packaged MCP servers and hooks. It does not change your global Node installation. The native installer accepts `--dry-run` and `--node`; Claude file-copy flags such as `--project`, `--user`, `--stack` and `--with` are unsupported.

## First session

Open your **application project**, not the kit checkout, in a fresh Codex session.

1. Review the installed hook definitions with `/hooks`. Installation does not grant trust. Hook safeguards require host support, enabled hooks and review of the exact definitions.
2. Invoke `$framework-doctor`. It checks installed resources, the live bridge connection, skills, stack trust, hook evidence and interrupted runs.
3. Create or review the application's `AGENTS.md`: project facts, exact test/lint/build commands, constraints and links to relevant context docs. Installation does not create it for you.
4. Invoke `$sdd <ticket or description>` to begin. Use the installed skill picker if needed.

```text
$framework-doctor
$sdd PROJ-123
```

These are chat inputs, not shell commands. All first-party skill add-ons are bundled, so there is no separate Laravel or Next.js plugin install step. Framework hooks still apply only to matching projects. Optional external MCP services are not installed just because their skill guidance is bundled.

## Verify the installation

In a terminal, inspect the configured marketplace and plugin:

```sh
codex plugin marketplace list
codex plugin list
```

In the session, `$framework-doctor` should find `sdd-runtime`, core skills and the SDD MCP tools. It calls `stack_list` to test the live bridge connection. A connection failure is a failure; untrusted custom stacks are warnings requiring review.

The doctor reports hooks as unverified until there is evidence they execute. Context7 and Playwright connecting is only transport discovery. Browser acceptance requires an actual browser scenario; missing tools or blocked checks do not count as passes.

## Commands and workflows

Use `$sdd`, `$write-spec`, `$execute-task`, `$deep-review` and other installed skills. Claude plugin prefixes such as `/sdd-kit:sdd` and host controls such as `/workflows` are not Codex commands.

The six workflows remain `create-spec`, `ship-feature`, `fix-bug`, `qa-and-docs`, `tech-research` and `greenfield-build`. They are workflow names, not six new `$` skills. `$sdd` routes normal work. For an explicit workflow, ask `$sdd-runtime` to run it with the required workspace and inputs. A feature build still needs an approved spec.

The bridge emits jobs; the parent claims them, delegates each to a fresh native worker and submits the worker's actual result. JSON schemas and source gates control progression. A separate completion reviewer checks whether the final report is supported; a completed transport run does not override a blocked source outcome.

Use `$progress` to inspect project/spec progress and native workflow activity. Keep the run id when handing work over.

## Project files and custom stacks

Specs and shared artifacts use `.ai/specs/`, `docs/context/`, `docs/api/`, `docs/schemas/` and `docs/adr/`. Codex project context belongs in `AGENTS.md`.

SDD reads matching Markdown conventions from bundled rules and project `.codex/rules/*.md`; these are skill-managed instructions, not Codex shell-permission `.rules` files. It discovers custom stacks in project/user `.codex/stacks/` and project `.codex/stack-addons/`.

Use `$stack-trust` to review a custom stack's source, commands and exact SHA-256 before approval. A changed manifest needs fresh approval. Creating a stack with `$new-stack` does not approve it. The native trust store is separate from Claude's. Project agent memory uses `.ai/agents/` and respects the user's memory preferences.

## Execution and recovery

Run state lives in the target project's `.ai/codex-workflows/`, excluded from Git and written with owner-only permissions. After interruption, preserve the run id and use the original plugin build. The runtime resumes through `workflow_resume` and reconnects original workers through `workflow_reconnect`.

Completed receipts are replayed without repeating edits. Uncertain claimed work is never automatically redispatched. If the original worker cannot be recovered, stop and report the partial state; do not delete locks or fabricate receipts. Changed workflow source, adapter version or stack trust can prevent resume.

This is recovery within Codex, not a way to import an active Claude run. Specs and completed evidence can be shared between hosts; active workers cannot.

## Updates

Finish or explicitly stop active workflows **before** updating. A Codex cache update can remove an old version's directory; recovery requires its original build.

Update the checkout to the reviewed revision, then run from its root:

```sh
npm ci --ignore-scripts
node cli/sdd-kit.mjs install --host codex --dry-run
node cli/sdd-kit.mjs install --host codex
```

Start a fresh session and rerun `$framework-doctor`; review changed hook definitions. Keep the old build while any run still needs it. `codex plugin marketplace upgrade` refreshes Git marketplace snapshots; it does not rebuild this local checkout's `dist/codex`.

## Uninstalling

Finish active runs and preserve any recovery information first. In your terminal:

```sh
codex plugin remove sdd-kit@sdd-kit
```

If you no longer need this marketplace, remove its registration:

```sh
codex plugin marketplace remove sdd-kit
```

Plugin removal deletes its local cache. It is not a request to delete your application specs, context, run records or the source checkout. The host's plugin settings can also disable a plugin without removing project content.

## Shared development

```sh
npm test
node cli/sdd-kit.mjs build --host all
node cli/sdd-kit.mjs build --host codex
```

Edit shared behavior in `plugins/` and `share/`; change `adapters/codex/` for host differences. See [architecture](../architecture.md) and the [host contract](../../adapters/codex/skill-overlays/sdd-runtime/references/compatibility.md).

Source checkpoints in this checkout: `cli/sdd-kit.mjs:117` routes hosts; `scripts/install-host.mjs:7` defines supported flags and installation commands; `adapters/codex/build.mjs:29` packages resources; `adapters/codex/skill-overlays/framework-doctor/SKILL.md:8` defines native diagnosis.

## Verification limits

Package and adapter tests cover source preservation, workflow startup, schema validation, recovery, native stacks, lifecycle parsing, patch guards and MCP transport. Recorded native worker scenarios are bounded fixture acceptance, not proof that every real application passes.

Model identities and token accounting differ from Claude. Native jobs inherit the current Codex model unless the user supplies an explicit mapping; Claude model aliases do not establish equivalent Codex tiers. Per-job native token counters are unavailable. Hook support/trust and real browser acceptance must be verified on the host being used.
