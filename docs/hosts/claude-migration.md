# Migrating an older Claude Code installation

These notes describe the historical 1.x → 2.x → 3.x transitions. They do not install Codex support. For a current installation, use the [Claude Code guide](claude.md); to add Codex, use the [Codex guide](codex.md). Paths in old-version columns refer to those historical releases.

## Upgrading from 2.x

3.0 moves the Laravel, Next.js and docker/ddev components out of the core into add-ons.

**Plugin mode.** Install the preset, `/plugin install sdd-kit-laravel-nextjs@sdd-kit`, to keep what 2.x gave you. Namespaces
follow the plugin that ships the component: `/sdd-kit-laravel:laravel-12`, agents `sdd-kit-laravel:laravel-backend-dev`
and `sdd-kit-nextjs:nextjs-frontend-dev`. Claude Code installs the preset's dependencies; on claude.ai install each add-on yourself.
A SessionStart hint suggests the matching add-on once per project.

**File-copy mode.** Re-run `install.sh` (use `--dry-run` first). With no `--stack` it installs the Laravel and Next.js
add-ons, plus devenv on a fresh install. Moved files are replaced at their new paths, old paths are retired, and every
overwritten or removed file is backed up to `.claude/.framework-backups/<timestamp>/`. A user agent with the same name as
an add-on agent wins: the staged copy is dropped and the installer prints the fix. Use `--prune` to drop add-ons you no longer want.
Bare names keep working (`/laravel-12`, `/migrate-db`, agent `laravel-backend-dev`).

## Upgrading from 1.x

Re-run the current Claude file-copy installer (or update the Claude plugin). In file-copy mode it removes the files 1.x
installed that 2.0 no longer ships (retired agents, skills, templates, and scripts) and backs
them up first. It only removes a file whose content matches a copy the kit shipped; a file you
edited or replaced (for example an upstream Stripe or skill-creator skill installed at the same
path) is listed as "kept (modified or not from the kit)" and left for you to review.

The tables below match the CHANGELOG's [Migrating from 1.x](https://github.com/stasmarkov/sdd-kit/blob/v3.1.0/CHANGELOG.md#migrating-from-1x) section. They list what a 1.x release shipped; components that were added and removed again during the 2.0 cycle appear only in the CHANGELOG's *Removed* table.
Current lists: [skills](../reference/skills.md),
[agents](../reference/agents.md).

### Commands

Commands became skills with flat names. Only the commands in the table's left column existed in
1.x; a name that is not listed (for example `/kanban` or `/add-context`) never existed as a flat
command and has no stub.

| 1.x | 2.0 |
|-----|-----|
| `/upstream:create-spec` | `/write-spec` |
| `/upstream:research-spec` | `/write-spec --background` (runs the `create-spec` workflow) |
| `/upstream:tech-research` | `/sdd` (or `/tech-research` directly) |
| `/execution:ship-feature` | `/sdd` (or `/ship-feature` directly) |
| `/execution:fix-bug` | `/sdd` (or `/fix-bug` directly) |
| `/execution:greenfield-build` | `/sdd` (or `/greenfield-build` directly) |
| `/quality:qa-and-docs` | `/sdd` (or `/qa-and-docs` directly) |
| `/quality:code-review` | `/deep-review --depth=standard` |
| `/quality:deep-review` | `/deep-review` |
| `/quality:test` | `/run-tests` |
| `/workflow:status` | `/progress --health` |
| `/workflow:doctor` | `/framework-doctor` |
| `/workflow:update-knowledge-graph` | Removed (knowledge graph retired) |
| `/execution:execute-task`, `/execution:simple-task`, `/execution:generate`, `/execution:migrate-db` | `/execute-task`, `/simple-task`, `/generate`, `/migrate-db` |
| `/discovery:investigate` | `/investigate` |
| `/discovery:analyze-docs` | `/write-docs --audit` |
| `/design:design-api`, `/design:design-schema` | `/design-api`, `/design-schema` |
| `/design:design-ui` | `/design-ui` (design add-on) |
| `/quality:grade`, `/quality:lint`, `/quality:security-scan`, `/quality:upgrade-deps` | `/grade`, `/lint`, `/security-scan`, `/upgrade-deps` |
| `/release:changelog` | `/changelog` |
| `/release:deploy`, `/release:rollback`, `/release:feature-flag` | `/deploy`, `/rollback`, `/feature-flag` (ops add-on) |
| `/operations:health-check`, `/operations:incident` | `/health-check`, `/incident` (ops add-on) |
| `/workflow:progress`, `/workflow:sync-obsidian`, `/workflow:write-docs` | `/progress`, `/sync-obsidian`, `/write-docs` |
| `/workflow:add-context` | `/write-docs --import` |
| `/workflow:getting-started` | `/framework-doctor`, then `GETTING-STARTED.md` |
| `/workflow:kanban` | `/spec-board` |

`/sdd` routes work to the right workflow. The workflows stay directly runnable as
`/ship-feature`, `/fix-bug`, `/qa-and-docs`, `/tech-research`, `/greenfield-build`, and
`/create-spec`.

The old namespaced commands remain as redirect stubs in `.claude/commands/`
(full installs and plugin mode; they are still shipped in 3.x and go in a later release). They are manual-only: Claude will not pick them on its own.
A stub translates old flags that changed meaning (`/workflow:add-context`, `/workflow:kanban`,
`/workflow:status`) and, for a user-invoked skill such as `/changelog` or `/framework-doctor`,
tells you the command to type. `/workflow:update-knowledge-graph` has no replacement; its stub
only explains the retirement.

### Removed skills and templates

Skills and templates are removed as well, not only commands:

| 1.x | 2.0 |
|-----|-----|
| `obsidian-sync` | `/sync-obsidian` |
| `stripe-best-practices`, `upgrade-stripe`, `stripe-projects` | Stripe's published skills: `install.sh --project --third-party` installs `stripe-best-practices` and `upgrade-stripe` (pinned in `share/settings/third-party.json`); `stripe-projects` is installed by hand (`docs/third-party.md`) |
| `skill-creator` | Anthropic's `skill-creator` plugin (third-party manifest) |
| `prompt-engineering-patterns` | Removed (outside the kit's scope) |
| `src/templates/code/*` | `laravel-12/assets/templates/`, `nextjs-15/assets/templates/`, used by `/generate` |
| `src/templates/specs/{feature,epic,user-story,requirements,code-review-checklist}.template.md`, `execute-task-workflow.md` | `write-spec` templates, `product-brief` assets, `specification-system.md` |
| `src/templates/specs/feature-flag-doc.template.md` | `feature-flag/references/flag-doc.template.md` (ops add-on) |
| `src/templates/context/workflow.template.md` | None: the Golden Triangle is business rules, architecture, and API contracts (`templates/context/golden-triangle.md`); the process lives in `/sdd` and `AGENTS.md` |
| `src/templates/commands/_templates/command.template.md` | `src/templates/skills/_templates/` (commands became skills) |
| `src/templates/knowledge-graph/*` | Removed (knowledge graph retired) |
| `drupal-11` (core in 1.x) | `drupal-11` in the drupal add-on (`--stack=drupal`) |

### Merged, moved, and removed agents

| 1.x | 2.0 |
|-----|-----|
| `api-dev` | `laravel-backend-dev` |
| `integration-dev` | `laravel-backend-dev` |
| `database-dev` | `database-designer` |
| `monitor`, `log-analyst`, `support-analyst` | `ops-analyst` (ops add-on) |
| `code-reviewer` | Removed; `/deep-review` uses `adversarial-reviewer` |
| `deployment-specialist`, `rollback-specialist`, `incident-responder` | Same names, ops add-on |
| `release-manager` | `/changelog --release <version>`, then `/deploy` (ops add-on) |
| `intake-processor` | `requirements-analyst`, `/product-brief --intake` |
| `pattern-discoverer` | `code-explorer` |
| `system-architect` | `api-architect` |
| `test-runner` | `code-quality` |
| `git-workflow` | `/open-pr` |
| `tech-researcher` | `tech-research` workflow, `/investigate` |
| `context-fetcher` | Removed (a subagent cannot see the main context) |
| `dependency-analyzer` | `/product-brief` (slice ordering, blockers), `/upgrade-deps`, `/security-scan`, `code-explorer` |
| `ui-ux-advisor` | Same name, design add-on |
| `knowledge-graph-manager`, `learning-extractor` | Removed (knowledge graph retired) |

If you used the moved agents, add the add-on: `--stack=laravel,nextjs,ios --with=ops,design` or the matching
`sdd-kit-*` plugins.

### Knowledge graph retired

Memory is now Claude Code auto memory plus agent memory (`memory: project` in agent
frontmatter). The installer already removes the `knowledge-graph-manager` and
`learning-extractor` agents, `scripts/kg-capture.sh`, `scripts/init-knowledge-graph.js`, and
`hooks/post-change-kg-sync.sh`, and drops the `kg-capture` hook from `settings.json`. It does
**not** touch your data or MCP config, so finish the cleanup by hand:

1. Remove the `knowledge-graph` entry from `mcpServers` in `.mcp.json` (or
   `claude mcp remove knowledge-graph`).
2. Delete `.claude/knowledge-graph.jsonl` and `.ai/knowledge-graph.jsonl` if present. Move
   anything worth keeping into `CLAUDE.md`, `AGENTS.md`, or `.claude/rules/` first.

### Other leftovers

- 1.x left `*.backup.*` copies inside `.claude/`. The installer warns about them; delete
  them once you no longer need them.
- Cards in a 1.x `.ai/kanban.json` are not read by `/spec-board`, which takes status from the
  spec files. A card with a spec needs nothing. Drop the DONE, IN_PROGRESS, and REVIEW cards
  that have no spec: that work is already started or finished, and a backlog slice would
  re-plan it. Migrate only the BACKLOG and TODO cards without a spec: paste their titles and
  descriptions into `/product-brief --intake "<cards>"` (with no `product-brief.md` yet, it
  offers to write the brief first or to start a backlog only), or turn one into a spec with
  `/write-spec`. Then delete the file.
- Documents imported with 1.x `/workflow:add-context` into `.claude/context/business/`,
  `.claude/context/architecture/`, or `.claude/context/workflow/` are no longer read by anything:
  their only readers were the retired `context-fetcher` agent and the knowledge graph. Re-import
  each one into the Golden Triangle paths that `/write-spec`, `create-spec`, and
  `/framework-doctor` read: `/write-docs --import .claude/context/<dir>/<file> --as=business`
  (or `--as=architecture`, `--as=api`; for `workflow/` files, pick the one that fits or fold
  them into `AGENTS.md`). Then delete `.claude/context/`. `/framework-doctor` warns while it
  exists.
- `docs/context/workflow.md` from 1.x `/workflow:getting-started` is no longer generated, and
  `CLAUDE.md` no longer loads it. The SessionStart (compact) hook still re-injects its first lines after a
  compaction while the file exists, so fold anything still true into `AGENTS.md` (commands,
  red lines) and delete it.
- Files the installer kept because they no longer match the kit's copy are listed as "kept" in
  its plan; review each and delete the ones you do not use (a kept 1.x agent in a category
  folder, such as `agents/quality/code-reviewer.md`, still loads next to the flat 2.0 agents).
- A 2.0 `--minimal` install ships no `.claude/commands/`, so a 1.x full install's namespaced
  commands stay behind. `/framework-doctor` flags them; delete the namespaced folders
  (`upstream/`, `quality/`, `execution/`, `workflow/`, `_shared/`, and so on) under
  `.claude/commands/`.
