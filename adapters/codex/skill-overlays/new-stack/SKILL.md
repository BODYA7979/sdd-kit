---
name: new-stack
description: Add a custom project stack to native SDD Kit for Codex, including its manifest, conventions skill and agent instructions. Use when the project's framework is not covered by a bundled stack.
---

# Add a native stack

Collect the stack name, role, detection rule, source globs, real verification commands and conventions. Inspect the project to confirm these inputs. Write an answers JSON file using the same fields as upstream: `name`, `role`, `detect`, `paths`, `gates` (name/command/kind), and optional `markers`, `title`, `agent`, `order`, `conventions`, `debugPatterns`, `acceptance`, `author`.

Run this skill's `scripts/new-stack.mjs --answers FILE --target project --root ABSOLUTE_PROJECT`. It refuses existing names/files and creates native `.codex/stacks`, `.codex/agents`, `.codex/stack-addons` and `.agents/skills` files. Review and refine the generated guidance.

Use `stack_list` to show the exact manifest commands and SHA-256. Obtain human approval through `$stack-trust` before running them. Scaffolding never grants trust or installs executable hooks. Workflow gate execution uses the approved manifest; project-local native skills and agents become discoverable after the host refreshes the project.

The private upstream source-generator target `src/plugins` is not part of this public distribution. Add portable stacks through the project target and share their reviewed files as needed.
