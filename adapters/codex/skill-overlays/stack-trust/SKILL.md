---
name: stack-trust
description: Inspect and explicitly approve the exact commands of a custom SDD stack manifest in native Codex before its gates can execute.
---

# Native stack trust

Call `stack_list` with the absolute workspace root. It discovers `.codex/stacks/*.json`, the user's `.codex/stacks`, project `.codex/stack-addons/*/stack.json`, and bundled first-party stacks.

For each untrusted entry, show its source, SHA-256 and command-bearing fields. Read the user's approval of those exact commands before calling `stack_approve` with the displayed source and hash. Never approve automatically, infer approval from a request to run a workflow, or write the trust store directly. A changed hash requires a fresh review. Rejected manifests must be corrected before approval.

The store is under the OS user's `.codex/sdd-kit/trusted-stacks.json`, independent of project environment overrides. Permission failures are errors, not empty or trusted data. Native Codex controls file access; this skill does not add Claude allow rules.

For scripted inspection, the bundled `scripts/trust-store.mjs` supports `--list`, `--list-untrusted`, `--show SOURCE`, `--hash FILE`, and `check FILE`. `--approve SOURCE SHA256` requires the same explicit human approval as the tool.
