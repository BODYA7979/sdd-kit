# Team rollout for Claude Code and Codex

Use one reviewed SDD Kit revision and one set of project rules, then distribute the correct package to each host. A marketplace is a catalog, not a guarantee that its commands, hooks or generated work are safe. Keep the source revision, host/client version and validation evidence together.

## Common rollout plan

1. Select a reviewed commit. The original upstream `v3.1.0` tag contains the Claude distribution; Codex needs a revision of this fork containing the native adapter.
2. Build both host packages from that same checkout with `npm ci --ignore-scripts`, `npm test` and `node cli/sdd-kit.mjs build --host all`.
3. Pilot a small representative project in each host. Verify skill discovery, real hook behavior, gate execution, a browser scenario when applicable and interrupted-run recovery.
4. Document project commands and constraints once in `AGENTS.md`; Claude's `CLAUDE.md` imports it. Host settings stay in their respective configuration formats.
5. Publish or share the reviewed artifact through your team's approved channel, with the exact revision and update instructions. Building locally does not publish anything.
6. Finish active workflows before upgrading, especially Codex runs tied to a specific build.

The [validation record](../validation.md) is evidence from bounded fixtures, not a substitute for your team's project acceptance.

## Claude Code marketplace

The built `dist/claude` directory is already a marketplace: it contains `.claude-plugin/marketplace.json`, core and add-on plugins, and shared resources. Preserve this layout when distributing it. Test it locally in a terminal:

```sh
claude plugin validate /path/to/sdd-kit/dist/claude
claude plugin marketplace add /path/to/sdd-kit/dist/claude
claude plugin install sdd-kit-laravel-nextjs@sdd-kit --scope project
```

Run the install from the target application directory when using project scope. For core alone use `sdd-kit@sdd-kit`; select add-ons for the application's stack. The preset references core, Laravel, Next.js and devenv, so a custom catalog must make every dependency available at compatible versions.

To distribute a team-owned catalog, publish the reviewed marketplace directory in a repository contributors can read. Keep plugin names and relative source paths consistent. If your team changes the marketplace name, update the `plugin@marketplace` installation ids accordingly. See the [official marketplace guide](https://code.claude.com/docs/en/plugin-marketplaces) for the catalog format and [organization controls](https://code.claude.com/docs/en/plugins/org) for managed policy.

A catalog may instead reference reviewed upstream plugin sources pinned to a commit. Use the original upstream only when you want the original Claude release; use your fork/artifact when you need local changes. Do not point a Codex user at an unbuilt Claude plugin directory.

### Updates and policy

Update through a reviewed change to the team catalog/artifact. Keep core and add-ons aligned. Teammates refresh the marketplace and update each installed plugin:

```sh
claude plugin marketplace update sdd-kit
claude plugin update sdd-kit@sdd-kit
```

Then reload or start a fresh session. Substitute your actual marketplace name and repeat for installed add-ons. Organization allowlists, forced enablement and auto-update controls belong to Claude's managed settings; do not copy those JSON keys into Codex configuration.

## Codex marketplace

The native build writes `dist/codex/.agents/plugins/marketplace.json` and `dist/codex/plugins/sdd-kit/`. Its source paths are relative to **`dist/codex`**, so distribute that entire directory, including hidden metadata and bundled runtime dependencies.

For a source checkout, each teammate uses the [Codex installation guide](../hosts/codex.md). To test an already built artifact, register its marketplace root and install it in a terminal:

```sh
codex plugin marketplace add /path/to/reviewed-codex-marketplace
codex plugin add sdd-kit@sdd-kit
```

The package includes all first-party skills. There is no native `sdd-kit-laravel-nextjs` install step or Claude-style `--stack` selection. Retain the reviewed artifact for updates and run recovery.

The current installer uses the local Codex CLI's `plugin add` interface. Clients differ in marketplace/plugin UI availability; use the [official Codex plugin guide](https://developers.openai.com/plugins/build/plugins) and the installed host's help to check the supported route. A team catalog does not itself approve hook definitions or custom stack commands.

### Updates and policy

Finish or stop active workflows, build the reviewed revision, reinstall it, then start a fresh session and run `$framework-doctor`. Inspect changed hooks. `codex plugin marketplace upgrade` refreshes Git sources; it does not build a source checkout's native package.

Codex project enablement uses Codex configuration, not Claude's `enabledPlugins`. Apply organization policy through the supported controls of the exact client being deployed. Keep any host-specific configuration small and separately documented; do not present identical settings across hosts as interchangeable.

## Shared project setup

Commit shared business rules, architecture, API contracts, specs and the applicable `AGENTS.md` instructions. Record host setup separately:

| Shared | Claude-specific | Codex-specific |
| --- | --- | --- |
| `AGENTS.md`, `.ai/specs/`, `docs/` | `CLAUDE.md`, `.claude/rules/`, Claude project settings | `.codex/rules/`, Codex project settings, local run receipts |

Area-rule paths and approval stores differ. A reviewed stack manifest still needs the explicit trust flow required by the host; do not distribute a trust-store file as a shortcut. Keep `.ai/codex-workflows/` runtime records local and preserve them for recovery.

## Acceptance before promotion

Record which client and source revision you tested. Check installation and uninstallation, a normal workflow, a deliberately blocked gate, relevant stack rules, actual browser access and recovery after interruption. State untested areas separately.

Model changes can alter behavior without any kit source change, so representative application acceptance matters after a host/model update too. Keep the previous reviewed artifact available until all its runs are finished. Promotion is a team decision based on evidence, not the package build's exit code.

Implementation: [root build](../../scripts/build.mjs#L10), [Claude artifact](../../adapters/claude/build.mjs#L5), [native artifact and marketplace](../../adapters/codex/build.mjs#L29), [native installation](../../scripts/install-host.mjs#L7).
