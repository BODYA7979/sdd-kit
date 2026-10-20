---
description: "Replaced by /write-docs --import in v2.0"
disable-model-invocation: true
---

`/workflow:add-context` was replaced by `/write-docs --import` in v2.0. The old flags mean different things there, so translate them before running anything. Old arguments: $ARGUMENTS

| Old | New |
|-----|-----|
| `--source=<file\|url>` | `--import <file\|url>` (in write-docs, `--source` is the code path for generate and audit modes) |
| `--destination=business` | `--as=business` |
| `--destination=architecture` | `--as=architecture` |
| `--destination=workflow` or `general` | no equivalent: ask whether the content is business rules, architecture, or API contracts, and use that `--as` |
| anything else | drop it and say so |

Documents the user imported with the 1.x command live under `.claude/context/{business,architecture,workflow}/`, and nothing in 2.0 reads that folder any more. If it exists, tell the user and offer to re-import each file: `/write-docs --import .claude/context/<dir>/<file> --as=business|architecture|api`, then delete `.claude/context/`.

Then run the `write-docs` skill with the translated arguments and show the user the new command (for example `/write-docs --import rules.pdf --as=business`) so they can use it directly next time. With no `--source`, ask for the file or URL to import.
