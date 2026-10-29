# Installing SDD Kit

Choose your agent first, then follow its installation guide. You only need the host you use. A team can share project documents and specs across both hosts.

## Choose a mode

| Your setup | Use | Result |
| --- | --- | --- |
| Claude Code, standard setup or team rollout | [Claude marketplace plugin](../hosts/claude.md#plugin-installation) | Core plus selected add-ons |
| Claude Code, editable kit files in a project | [Claude file copy](../hosts/claude.md#file-copy-installation) | Managed files under `.claude/` |
| Codex desktop or CLI with native plugin support | [Codex native plugin](../hosts/codex.md#install-from-this-checkout) | Generated plugin with all first-party skills |

The root CLI defaults to **Claude file copy** when `--host` is omitted. Name the host in new checkout instructions. `--project`, `--user`, `--stack` and `--with` are Claude installer flags; they do not configure Codex.

## Prerequisites

| Requirement | Claude Code | Codex |
| --- | --- | --- |
| Agent | Claude Code installed and signed in | Codex installed and signed in; CLI exposing `plugin add` |
| Git | Marketplace/checkout installation | Host-enabled checkout and marketplace tooling |
| Node / npm | Node 18+ for the launcher; external tools can require newer Node | Node 20+ for the adapter; npm for dependencies |
| bash and jq | Installer and shell guards | Shared shell guards behind the native adapter |
| Browser | Browser acceptance checks | Browser acceptance checks |
| Project runtime | Your application's runtime, database and services | The same project requirements |

A browser server connecting does not prove it can launch a browser. The bundled Playwright MCP uses an isolated headless browser. Unavailable checks must be reported as not run.

## Plugin mode

### Claude Code

Inside Claude Code:

```text
/plugin marketplace add stasmarkov/sdd-kit
/plugin install sdd-kit@sdd-kit
```

For Laravel + Next.js, use `/plugin install sdd-kit-laravel-nextjs@sdd-kit` to install core and its stack/devenv dependencies. Start a fresh session and run `/sdd-kit:framework-doctor`. [Full instructions](../hosts/claude.md).

### Codex

In a terminal at the root of this **host-enabled checkout**:

```sh
npm ci --ignore-scripts
node cli/sdd-kit.mjs install --host codex --dry-run
node cli/sdd-kit.mjs install --host codex
```

Open a fresh Codex session in your application project, review `/hooks`, and invoke `$framework-doctor`. Use `$sdd` to start work. [Full instructions](../hosts/codex.md).

**Revision matters:** the original upstream `v3.1.0` tag is the Claude distribution. It does not contain this fork's Codex adapter. Use a reviewed revision containing `adapters/codex/`.

## Namespacing

Claude plugin skills use `/sdd-kit:sdd`; Claude file-copy skills use `/sdd`; Codex skills use `$sdd`. Add-on namespaces and workflow invocation are explained in the [command comparison](../hosts/compare.md#commands).

## Project context is not installed

Plugin installation does not create the application's `CLAUDE.md`, `AGENTS.md` or project rules. Create or merge them with the [first-session guide](getting-started.md#project-context). Claude project file-copy mode creates templates when absent; review and fill them in before use.

## File-copy mode

**Claude Code only.** From your application root, using an existing kit checkout:

```sh
node /path/to/sdd-kit/cli/sdd-kit.mjs install --host claude --project --dry-run
node /path/to/sdd-kit/cli/sdd-kit.mjs install --host claude --project
```

The target is the current directory's `.claude/`, not the kit checkout. Use `--user` for `~/.claude/`. [Flags, defaults and updates](../hosts/claude.md#file-copy-installation).

### Without cloning

The original released Claude installer and independent spec-board CLI are available via GitHub. The package is not published to npm.

```sh
# npm 11, from the application root
npx github:stasmarkov/sdd-kit install --project --dry-run
npx github:stasmarkov/sdd-kit install --project

# npm 12 requires explicit Git dependency permission
npx --allow-git=root github:stasmarkov/sdd-kit install --project --dry-run
npx --allow-git=root github:stasmarkov/sdd-kit install --project
```

Original-release recipes omit `--host` for compatibility with older tags. The fork's checkout CLI accepts `--host claude` explicitly. A stable checkout is the documented Codex path because updates and recovery depend on retaining the original build.

## Playwright in plugin mode

Both packages include Context7 and Playwright MCP configuration. Claude plugin tools may use a plugin-qualified name; standard setup needs no duplicate project `.mcp.json`. Codex adds the `sdd-workflows` MCP server for native execution.

For Claude browser selection, see [MCP servers](../hosts/claude.md#mcp-servers). For Codex connection and hook checks, see [verify Codex](../hosts/codex.md#verify-the-installation). Claude project configuration does not configure Codex.

## MCP servers

The [core MCP configuration](../../plugins/sdd-kit/.mcp.json) defines shared defaults. Optional examples live in [`share/mcp-configs/`](../../share/mcp-configs/) and add-on folders. Configure them using your host's supported settings. Keep credentials outside committed files. Bundling an instruction or example does not install the external service.

## Recommended settings

Start with project context and explicit gate commands, then use the host's permission controls. Claude `.claude/settings.json` and Codex `.codex/config.toml` are different formats. Installation does not approve hooks, custom stacks or publication. See the [host comparison](../hosts/compare.md).

## Verifying an install

| Check | Claude Code | Codex |
| --- | --- | --- |
| Skills and runtime | `/sdd-kit:framework-doctor` (plugin) or `/framework-doctor` (files) | `$framework-doctor` |
| Hooks | `/hooks`; verify execution | `/hooks`; review definitions and verify execution |
| Small task | `/sdd-kit:sdd <task>` or `/sdd <task>` | `$sdd <task>` |
| Progress | `/workflows` and the report | `$progress`; run id and runtime status |

A file on disk does not prove that the host loaded it or fired its hooks. Complete setup with the [first-session guide](getting-started.md).

## Updates

- **Claude plugin:** refresh the marketplace, update installed plugins, then reload or start a fresh session. [Details](../hosts/claude.md#updates).
- **Claude file copy:** run the installer from the same target directory with `--dry-run`, then apply the reviewed plan.
- **Codex:** finish active workflows, update the checkout to the reviewed revision, rebuild and reinstall. Retain the old build until its runs finish. [Details](../hosts/codex.md#updates).

## Upgrading from 2.x

This historical Claude migration moved stack components into add-ons. [Migration instructions](../hosts/claude-migration.md#upgrading-from-2x). Adding Codex is a separate host installation.

## Upgrading from 1.x

The [historical migration reference](../hosts/claude-migration.md#upgrading-from-1x) lists renamed commands, retired files and data requiring review. Preview the current installer before applying an upgrade.

## Uninstalling

Use the [Claude](../hosts/claude.md#uninstalling) or [Codex](../hosts/codex.md#uninstalling) procedure. Project specs, docs and context belong to the project. Claude file-copy mode has no `--uninstall` flag.

## Troubleshooting

| Symptom | Next action |
| --- | --- |
| `/sdd` missing in Claude plugin mode | Use `/sdd-kit:sdd`; check core is installed and enabled |
| `$sdd` missing in Codex | Start a fresh session; check `codex plugin list`; run the native doctor |
| Codex rejects `--project` or `--stack` | Remove Claude-only flags; first-party skills are already bundled |
| Browser acceptance cannot run | Check the actual browser tools and installation; keep the not-run result |
| Hook files exist but execution is unverified | Inspect host hook state and obtain runtime evidence |
| Codex run was interrupted | Preserve its id and build; follow [recovery](../hosts/codex.md#execution-and-recovery) |
| Spec board cannot find specs | Run from the application root or pass spec folders explicitly |

Implementation: [host routing](../../cli/sdd-kit.mjs#L117), [native installer](../../scripts/install-host.mjs#L7), [Claude flags](../../install.sh#L192), [native build](../../adapters/codex/build.mjs#L29).
