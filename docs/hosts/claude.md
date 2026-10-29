# SDD Kit in Claude Code

Use the marketplace plugin for a standard installation or team rollout. Use file-copy mode when you need project-owned, editable kit files. Pick one mode per project to avoid loading duplicate skills and hooks. Codex has a [separate native installation](codex.md).

## Requirements

Install and sign in to Claude Code using its [official setup guide](https://code.claude.com/docs/en/setup). SDD Kit's launcher needs Node 18+; its MCP tools may require a newer Node version. Git is needed for marketplace or checkout installation. Shell guards need bash and jq. Browser acceptance needs a working browser as well as the Playwright MCP connection.

The kit does not install your application's PHP/Node runtime, database or services. Those are separate project prerequisites.

## Plugin installation

Run these **inside Claude Code**, not your shell:

```text
/plugin marketplace add stasmarkov/sdd-kit
/plugin install sdd-kit@sdd-kit
```

This installs the stack-neutral core from the original release marketplace. For Laravel + Next.js, install the preset instead of selecting dependencies one by one:

```text
/plugin install sdd-kit-laravel-nextjs@sdd-kit
```

The preset includes core, Laravel, Next.js and devenv. Other add-ons are optional:

| Add-on | Install in Claude Code |
| --- | --- |
| Laravel | `/plugin install sdd-kit-laravel@sdd-kit` |
| Next.js | `/plugin install sdd-kit-nextjs@sdd-kit` |
| Docker / DDEV guidance | `/plugin install sdd-kit-devenv@sdd-kit` |
| Operations | `/plugin install sdd-kit-ops@sdd-kit` |
| UI design | `/plugin install sdd-kit-design@sdd-kit` |
| Drupal | `/plugin install sdd-kit-drupal@sdd-kit` |
| iOS / Swift | `/plugin install sdd-kit-ios@sdd-kit` |

Restart the session in your **application** project. Run `/sdd-kit:framework-doctor`, inspect `/hooks`, then start `/sdd-kit:sdd <ticket or description>`.

### Pin a release or use a checkout

To use the original Claude release tag, register `stasmarkov/sdd-kit#v3.1.0`. That tag is not a Codex distribution. Teams should record the reviewed commit alongside the version.

For this fork's local changes, load the appropriate directories from your checkout in a terminal:

```sh
claude --plugin-dir /path/to/sdd-kit/plugins/sdd-kit \
       --plugin-dir /path/to/sdd-kit/plugins/sdd-kit-laravel \
       --plugin-dir /path/to/sdd-kit/plugins/sdd-kit-nextjs
```

Choose directories matching your stack. The root builder also produces a Claude marketplace in `dist/claude`; it preserves canonical plugin files. See [shared development](../architecture.md).

### Commands and project context

Plugin skills are namespaced: `/sdd-kit:sdd`, `/sdd-kit:write-spec`, `/sdd-kit:execute-task`. Add-on skills use the add-on namespace, for example `/sdd-kit-ops:deploy`. Bare `/sdd` examples elsewhere refer to file-copy mode.

Plugin installation does not create application `CLAUDE.md`, `AGENTS.md` or area rules. Create or merge project context once using the [first-session guide](../reference/getting-started.md#project-context). Preserve existing files.

## File-copy installation

From your **application root**, with an existing kit checkout:

```sh
node /path/to/sdd-kit/cli/sdd-kit.mjs install --host claude --project --dry-run
node /path/to/sdd-kit/cli/sdd-kit.mjs install --host claude --project
```

The original shell entry point is equivalent:

```sh
bash /path/to/sdd-kit/install.sh --project --dry-run
bash /path/to/sdd-kit/install.sh --project
```

`--project` targets the current directory's `.claude/`. Running from the kit's own root installs it into the kit. `--user` targets `~/.claude/` for all projects; it does not create each application's project context or project MCP file.

### Flags

| Flag | Meaning |
| --- | --- |
| `--project` / `--user` | Install into `./.claude/` / `~/.claude/` |
| `--full` | All core skills; default |
| `--minimal` | Main SDD path and its dependencies; omits auxiliary core skills such as progress, spec-board and investigate |
| `--stack=laravel,nextjs` | Choose stack add-ons; `none` installs core without a stack |
| `--with=ops,design` | Add optional add-ons |
| `--prune` | Remove installed add-ons outside the selected set on upgrade; back up removals and keep user-modified files |
| `--third-party` | Install pinned third-party skills from the manifest; separate trust policy applies |
| `--dry-run` | Show the plan without writing |
| `--yes` | Skip the install confirmation |

A fresh installation with no `--stack` selects Laravel, Next.js and devenv. An upgrade retains installed add-ons unless `--prune` requests removal. Stack add-ons are staged in full even with `--minimal`; the flag trims core. To choose explicitly:

```sh
bash /path/to/sdd-kit/install.sh --project --full --stack=none --dry-run
bash /path/to/sdd-kit/install.sh --project --full --stack=laravel,nextjs --with=ops --dry-run
```

Remove `--dry-run` after reviewing the selection. The [installation landing](../reference/installation.md#without-cloning) documents the original-release npx route and npm version differences.

### Files and updates

The installer records kit-owned files in `.claude/.framework-manifest`. It reports additions, updates and removals before applying them. Existing unowned files are kept. Modified kit-owned files may be backed up and replaced; review the plan rather than assuming local edits are permanent.

Replaced or removed files go under `.claude/.framework-backups/<timestamp>/`; only the five newest backup directories are retained. Hook settings are merged, while invalid JSON is left untouched and reported. Existing unrelated hooks and settings are preserved.

In project mode the installer merges Context7 and Playwright into `.mcp.json` without overriding same-named servers. It creates `CLAUDE.md`, `AGENTS.md` and default area rules when absent. Project context is yours to maintain. The spec-aware status line is added only when no status line is set.

Start Claude in the application root and invoke `/framework-doctor`, then `/sdd <task>`.

## MCP servers

Both install modes include Context7 and Playwright defaults. In plugin mode they come from the plugin's `.mcp.json`; the standard browser setup needs no duplicate project server. In file-copy project mode the installer merges them into the application's `.mcp.json`. In user mode it prints the corresponding `claude mcp add` commands.

Playwright is pinned in [the core configuration](../../plugins/sdd-kit/.mcp.json) and uses `--headless --isolated`. A working Chrome installation is the default path. For Chromium, install that browser and add `--browser chromium` to your own server configuration. In plugin mode a project server is a separate override; disable the bundled server in the host if all checks must use the replacement.

Browser phases use Playwright when available, may use Claude in Chrome when connected, and otherwise report **not run**. MCP discovery alone does not satisfy browser acceptance.

Optional examples are in [`share/mcp-configs/`](../../share/mcp-configs/) and add-on folders. Install external services separately and keep credentials outside committed JSON.

## Permissions, rules and hooks

Claude's permission settings belong to your project or user settings. Plugin installation does not import the kit's sample permission lists or environment configuration into those settings. File-copy hook installation preserves your permission choices.

Project `.claude/rules/*.md` hold path-scoped conventions. Plugin-mode users can copy and adapt applicable rules from `share/templates/rules/` and their stack add-on; plugins do not create project context automatically. See [mode comparison](../reference/plugin-mode.md).

Custom stack manifests require `/sdd-kit:stack-trust` (plugin) or `/stack-trust` (files), with explicit approval of the displayed commands and exact hash. A changed manifest needs a fresh approval. The stack-trust skill explains any required read permissions; do not copy Codex configuration into Claude settings.

## Updates

For a marketplace plugin, run in a terminal:

```sh
claude plugin marketplace update sdd-kit
claude plugin update sdd-kit@sdd-kit
```

Update each installed add-on as well, then use `/reload-plugins` or start a fresh session. A team catalog may pin a version; refreshing cannot override that pin. Finish active work before changing the package it uses.

For file-copy mode, update your kit checkout, run the same installer from the target application directory with `--dry-run`, and apply the reviewed plan. [Older 1.x/2.x migration notes](claude-migration.md) are separate from current setup.

## Uninstalling

In Claude Code, `/plugin uninstall sdd-kit@sdd-kit` removes core; repeat for installed add-ons. Remove a dependency preset before components it depends on. Remove the marketplace only when nothing else needs it.

File-copy mode has **no `--uninstall` flag**. Review `.claude/.framework-manifest` to identify installed files, preserve any work you want to keep, then remove only those kit files. Remove the kit's hook entries and status line from settings, and optional MCP entries you no longer use. Do not delete all of `.claude/`: it may contain unrelated skills and settings. Backups may help restore files replaced by the last installation.

`CLAUDE.md`, `AGENTS.md`, project rules, specs and docs are project content. Keep them unless you intentionally retire them.

## Troubleshooting

- **Missing skill:** use its plugin namespace; check the required add-on is installed. File-copy skills must be one directory below `skills/`.
- **Duplicate hooks or skills:** choose plugin or file copy for this project, then disable the other copy and its preset dependencies.
- **Hooks fail:** verify bash/jq, inspect `/hooks`, and run the doctor. Invalid settings JSON is reported rather than overwritten.
- **MCP fails:** check `claude mcp list` and the Node environment visible to Claude.
- **Browser not run:** verify both the actual browser and its tool connection.

Implementation sources: [installer options](../../install.sh#L192), [file ownership and backups](../../install.sh#L800), [project context creation](../../install.sh#L899), [shared CLI routing](../../cli/sdd-kit.mjs#L117), [Claude packager](../../adapters/claude/build.mjs).
