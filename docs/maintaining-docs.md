# Maintaining the documentation

Keep one explanation of the SDD process and make host differences explicit. Shared concepts belong in the reference pages; installation, command invocation, permissions and recovery belong in the [Claude Code](hosts/claude.md) and [Codex](hosts/codex.md) guides. The interactive guide's agent selector changes its examples. Static reference pages keep both labeled sets of instructions readable, including when JavaScript is unavailable.

See [documentation structure](documentation-structure.md) for the navigation model, selector behavior and the tradeoffs behind this layout.

## Sources and generated files

| Content | Edit here | Generated output |
| --- | --- | --- |
| Reference, host guides and example narrative | `docs/**/*.md` | HTML next to each Markdown source |
| Interactive guide explanations and host variants | `docs/guide-data.js`, `docs/host-data.js` | Read directly by the guide |
| Skill and agent catalog | Frontmatter under `plugins/*/skills/` and `plugins/*/agents/` | `docs/catalog.js` |
| Native runtime catalog entry | `adapters/codex/skill-overlays/sdd-runtime/SKILL.md` | Codex-only catalog entry |
| Workflow names and phases | The `meta` object in `plugins/sdd-kit/workflows/*.js` | `docs/catalog.js` |
| Example project artifacts | `docs/examples/job-board/artifacts/` | Example pages; the curated board snapshot remains separate |

The [documentation builder](../scripts/build-docs.mjs) renders Markdown, adds stable heading anchors and the shared navigation, and rewrites local Markdown links to their HTML pages. Source-code links outside `docs/` point to the repository because GitHub Pages only serves the documentation directory. The footer links to the local Markdown source instead of a stale release tag. Frontmatter remains available under **Document metadata**; example approvals and test claims are historical fixture data, not new verification results.

Do not edit generated HTML or `catalog.js` by hand. The historical `example-data.js` and `example-board.html` are curated snapshots from the worked example; changing the host selector does not rerun that example or make its evidence current.

## Build and check

From the repository root, with Node.js 18 or newer:

```sh
npm ci --ignore-scripts
npm run docs:build
npm run docs:check
node --test tests/docs.test.mjs
```

Commit the Markdown and regenerated HTML together. `docs:check` performs a read-only comparison and checks local page, asset, source-file and heading links. CI runs it for documentation changes. External links are preserved but are not fetched by this check; confirm vendor installation instructions against official sources when changing them.

`docs:build` also reports broken local links. Fix the source Markdown or navigation and rebuild; do not edit generated HTML to silence a failure. The [tests](../tests/docs.test.mjs) cover command escaping, links, anchors, source-derived catalog entries and generated-file drift.

## Host differences and review

- Keep commands attached to their host: Claude plugin skill names, Claude file-copy names, Codex skills, and host built-ins are separate interfaces.
- Never replace every slash with a dollar sign. Workflow names and built-in commands are not all skills.
- Describe Codex's bundled add-ons separately from Claude's selective plugin installation.
- Keep spec formats, approval requirements, acceptance criteria and verification concepts shared.
- Record source references for implementation claims and distinguish automated checks from live host, browser and hook acceptance.
- Review the guide at desktop and mobile widths, with keyboard navigation, all agent selections, and a copied command. A successful Markdown build does not verify the interactive UI.

See [architecture](architecture.md) for authoritative source ownership and [validation](validation.md) for recorded checks and their limits.
