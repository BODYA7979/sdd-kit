---
description: "Replaced by /progress --health in v2.0"
disable-model-invocation: true
---

`/workflow:status` was replaced by `/progress --health` in v2.0. Old arguments: $ARGUMENTS

| Old | New |
|-----|-----|
| `--tasks` | `/progress` (per-spec task progress, no health snapshot) |
| `--detailed`, `--summary`, none, or anything else | `/progress --health` (it has one level of detail; drop the old flag) |

Run the `progress` skill with the mapped arguments only, and show the user the new command.
