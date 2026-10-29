# Installation modes and host boundaries

SDD Kit has **two Claude installation modes** and a **native Codex plugin**. Select a host first; file-copy mode is a Claude feature. For runnable setup steps, use [installation](installation.md), [Claude](../hosts/claude.md) or [Codex](../hosts/codex.md).

## Choosing a mode

| | Claude plugin | Claude file copy | Codex plugin |
| --- | --- | --- | --- |
| Entry point | Marketplace, or local `--plugin-dir` | `install --host claude --project` / `--user` | `install --host codex` |
| Package choice | Core and optional add-ons | Core selection plus stack/tool add-ons | All first-party skills bundled |
| Skill syntax | `/sdd-kit:sdd` | `/sdd` | `$sdd` |
| Updates | Host marketplace/plugin update | Re-run installer after preview | Rebuild and reinstall reviewed checkout |
| Editable kit files | Change source, then package | Installed `.claude/` files; keep backups on update | Change shared/adapter source, then rebuild |
| Project context | Create/merge separately | Creates templates when absent in project mode | Create/merge `AGENTS.md` separately |
| Runtime | Claude workflow runner | Same Claude runner | Native MCP job bridge and Codex workers |
| Hook wiring | Plugin hook definitions | Merged project/user settings | Generated native event adapter; exact-definition trust required |
| External tools | Core plugin MCP configuration | Merged project MCP configuration | Core MCP defaults plus native workflow bridge |

The common source contract is documented in [architecture](../architecture.md). The [host comparison](../hosts/compare.md) covers commands, rules, trust and recovery.

## Shared content, different packaging

`plugins/` contains the authoritative core and add-on components. `share/` contains shared templates, installer resources and configuration examples. The Claude packager copies them without rewriting behavior. The Codex packager retains originals for provenance, adapts host-facing paths/frontmatter, and adds native runtime, stack-trust, scaffolding and doctor overlays.

| Package | Source path | Claude | Codex |
| --- | --- | --- | --- |
| Core | `plugins/sdd-kit/` | Install core | Bundled |
| Laravel / Next.js | `plugins/sdd-kit-laravel/`, `plugins/sdd-kit-nextjs/` | Select add-ons or preset | Skills, roles and resources bundled |
| Devenv / ops / design | Corresponding `plugins/sdd-kit-*/` directories | Optional add-ons | First-party skills/roles bundled |
| Drupal / iOS | Corresponding `plugins/sdd-kit-*/` directories | Optional early add-ons | Skills/resources bundled; same early maturity |
| Laravel + Next.js preset | `plugins/sdd-kit-laravel-nextjs/` | Dependency-only package | No separate native preset required |

An included skill is not an installed framework or external integration. Optional service setup remains host- and project-specific.

## Project context and rules

Keep shared facts in `AGENTS.md`. Claude's `CLAUDE.md` imports it; Codex reads it directly. Neither plugin install writes application context for you. The Claude project file-copy installer creates missing templates and leaves existing context intact.

Claude area rules live in `.claude/rules/`. Codex SDD reads bundled rules and `.codex/rules/*.md` through its provider mapping when paths match. These Markdown rules are instructions, not a replacement for the host's permission controls. Do not rename a settings file and assume it has migrated between hosts.

## Permissions and plugin settings

The kit's sample Claude permission and environment configuration is not automatically granted by installing a plugin. Permissions belong to the host's applicable user/project settings. Likewise, Codex installation does not trust hook definitions, approve custom stacks or authorize publishing work.

A role's declared restrictions and the host's actual capabilities both matter. Independent review needs a fresh context and evidence; a label such as "read-only reviewer" is not proof that the host prevented every write. Consult the current [Claude plugin documentation](https://code.claude.com/docs/en/plugins) and [Codex plugin documentation](https://developers.openai.com/plugins/build/plugins) for host-managed capabilities.

## Hooks and verification

Both packages reuse the original guards, but their event inputs differ. Claude guards consume Claude events. Codex normalizes native patches and lifecycle events before invoking applicable guards; shell writes are outside patch-specific guard coverage.

The native adapter uses explicit completion review in place of Claude prompt-based hook judgment. It does not have equivalent per-job token accounting. The [host contract](../../adapters/codex/skill-overlays/sdd-runtime/references/compatibility.md) lists these limits.

Check actual execution with the host doctor and hook UI. A successful build, a hook definition on disk or an MCP tool listing is not live hook/browser acceptance.

## Avoid duplicate installations

In Claude, combining a globally enabled plugin with a project file-copy installation can load duplicate components and hooks. Choose one for that project and disable the other, including the preset's dependencies. Do not remove project-owned rules or context while cleaning up kit components.

A separate Codex installation can coexist with Claude because host settings and runtime state differ. Share project specs and documentation; coordinate edits and hand off completed evidence rather than active workers.

## Source references

- [Claude packaging](../../adapters/claude/build.mjs#L5)
- [Codex packaging and overlays](../../adapters/codex/build.mjs#L29)
- [Claude context creation](../../install.sh#L899)
- [Codex provider mapping](../../adapters/codex/skill-overlays/sdd-runtime/SKILL.md#L10)
