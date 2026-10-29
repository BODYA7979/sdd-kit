---
name: framework-doctor
description: Diagnose a native SDD Kit Codex plugin installation, runtime connection, skills, stack trust, hooks and interrupted workflows with evidence-backed PASS/WARN/FAIL results.
---

# Native installation checks

1. Verify Node 20+ and jq are available. Locate this installed plugin from the skill's absolute path; verify its manifest, MCP configuration, runtime/server.mjs and `ajv` dependency exist.
2. Discover the SDD MCP tools. Call `stack_list` in the current workspace to test the live connection. A connection failure is FAIL; untrusted custom stacks are WARN with the `stack-trust` next step.
3. Inspect the native `/hooks` view or ask the user to open it when the host cannot expose it. Confirm the installed definitions were reviewed and trusted. A hook file existing on disk is not proof it runs; report UNVERIFIED until runtime evidence exists. Do not bypass hook trust.
4. Check the current skill catalog for `sdd-codex`, `sdd`, `write-spec`, `execute-task`, `deep-review`, `verification-gates` and relevant stack skills. Check references at their installed paths, not a development checkout.
5. Inspect `.ai/codex-workflows/*.json` for nonterminal runs. Report run ids, phases and claimed workers. Use `workflow_resume` and `workflow_reconnect` to recover; do not delete active lock files or redispatch uncertain edits.
6. Report PASS/WARN/FAIL per check and a concrete next action for each failed or unverified check. `--fix` can create missing project-local directories after checking existing files; it does not grant hook trust, approve stacks, modify user permissions or install dependencies silently.
