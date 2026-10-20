---
description: "Replaced by /spec-board in v2.0"
disable-model-invocation: true
---

`/workflow:kanban` was replaced by `/spec-board` in v2.0. The board now reads status straight from the spec files (and backlog slices from backlog.md), so there is no `.ai/kanban.json` to move cards in. Old arguments: $ARGUMENTS

| Old | New |
|-----|-----|
| `--move=<card> --to=<column>` | no command: status lives in the spec's `spec-lite.md` frontmatter (`draft`, `approved`, `in-progress`, `done`). `/sdd <spec>` approves; `/execute-task` and ship-feature set `in-progress` and `done`. Tell the user this and change nothing |
| `--init` | nothing to create: the board reads `.ai/specs/` and `backlog.md` directly |
| `--filter=...` | the board's filter and search box (`--serve` or `--out`) |
| none, or anything else | run the `spec-board` skill with no arguments |

A user with cards in an old `.ai/kanban.json`: cards that name a spec need nothing. Drop DONE, IN_PROGRESS, and REVIEW cards that have no spec (the work is already started or finished). Migrate only the BACKLOG and TODO cards without a spec: pass their titles and descriptions, not the raw JSON, to `/product-brief --intake "<cards>"` (with no `product-brief.md` it offers to write the brief first or to start a backlog only), or turn one into a spec with `/write-spec`. Then the file can be deleted.
