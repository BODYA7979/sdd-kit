# Hooks

SDD Kit ships two kinds of scripts:

- **Claude Code lifecycle hooks** in `scripts/` (copied to `.claude/scripts/` in file-copy installs). Claude Code runs them on session, prompt, and tool events. They are described below.
- **Operational git/CI scripts** in `src/hooks/*.sh` (copied to `.claude/hooks/`). Claude Code never runs these; you wire them into git or CI yourself. See [Operational scripts](#operational-scripts).

For the hook API itself (events, matchers, exit codes, stdin/stdout JSON, async hooks), see the [official Claude Code hooks documentation](https://docs.claude.com/en/docs/claude-code/hooks).

## Lifecycle hooks

[`hooks/hooks.json`](https://github.com/stasmarkov/sdd-kit/blob/v2.1.0/plugins/sdd-kit/hooks/hooks.json) is the source of truth. If this table disagrees with that file, trust the file. All command hooks need `jq`.

| Script | Event (matcher) | Blocks? | Purpose | Tune/disable |
|--------|-----------------|---------|---------|--------------|
| `session-start.sh` | SessionStart | No | Reports active specs with unchecked tasks and the latest `.ai/session/spec-*-state.json`, and suggests `/execute-task --continue` | Remove the entry |
| `post-compact-context.sh` | SessionStart (`compact`) | No | After compaction, re-injects the first 30 lines of `docs/context/{business-rules,architecture,workflow}.md`, the active spec count, and the latest session checkpoint | Remove the entry |
| `block-dangerous.sh` | PreToolUse (`Bash`) | Yes (exit 2) | Blocks `rm` on `/` or `/*`, force pushes to `main`/`master`, and `DROP DATABASE`/`dropdb` | Keep it on. Run the command yourself if you really mean it |
| `check-commit-msg.sh` | PreToolUse (`Bash`) | Yes (exit 2) | Makes `git commit -m` subjects follow Conventional Commits (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`) and stay within 72 characters. Lets merge/revert messages and editor-based `--amend` through | Remove the entry |
| `token-budget.sh` | PreToolUse (`Read\|Grep\|Glob\|Bash`) | Yes (exit 2) | Always blocks `find /`. When context usage is at or above the threshold, it also blocks unbounded reads of 5,000+ line files, repo-wide content greps, `**` globs, unscoped recursive `grep`/`rg`, and `cat` of whole `.log` files | `CLAUDE_BUDGET_THRESHOLD` (default `75`, percent). Usage is read from `CLAUDE_CONTEXT_USAGE`. If that is unset, only the `find /` rule applies |
| `test-first-check.sh` | PreToolUse (`Write\|Edit`) | Yes (exit 2) | Blocks edits to Laravel controllers, models, services, and middleware, and to Next.js `components/**/*.tsx`, until a matching test file exists | `CLAUDE_SKIP_TEST_FIRST=1` |
| `prompt-preflight.sh` | UserPromptSubmit | No | Adds guardrail context when a prompt targets production data, force pushes, `rm -rf /`, or skipping verification. Adds a hint to load the spec when a prompt references one | Remove the entry |
| `lint-check.sh` | PostToolUse (`Write\|Edit`), async | No | Runs `vendor/bin/pint --test` on PHP and `node_modules/.bin/eslint` on JS/TS files that changed, and reports issues as a system message | Skipped automatically when the tool isn't installed |
| `scan-secrets.sh` | PostToolUse (`Write\|Edit`) | Reports (exit 2) | Scans the written file with `gitleaks` if it is installed, otherwise with a regex bank. On a hit, tells Claude to remove the secret and rotate it. The file is already written by then | Remove the entry (not recommended) |
| `scan-injection.sh` | PostToolUse (`Bash\|WebFetch\|mcp__.*`), async | No | Scans the first 32 KB of tool output for prompt-injection patterns and warns Claude | Remove the entry |
| `pre-compact-save.sh` | PreCompact | No | Writes a `.ai/session/pre-compact-<timestamp>.json` checkpoint (active spec, done/pending task counts) | Remove the entry |
| `session-end.sh` | SessionEnd, async | No | Writes a session summary (branch, uncommitted changes, recent commits) to `.ai/session/<timestamp>.md` and deletes summaries older than 30 days | Remove the entry |
| `notify.sh` | Notification | No | Shows a desktop notification | See [Notifications](#notifications) |
| *(prompt)* | Stop | Yes | Before Claude stops, checks that completed tasks have passing tests, no uncommitted changes are left unexplained, and session state is saved mid-spec | See [Stop and SubagentStop checks](#stop-and-subagentstop-checks) |
| *(prompt)* | SubagentStop | Yes | Checks that the subagent finished its task, and flags errors or incomplete results for a retry | Remove the entry |

Environment variables such as `CLAUDE_BUDGET_THRESHOLD` and `CLAUDE_SKIP_TEST_FIRST` can go in your shell or in the `env` block of `settings.json`. Both work in either install mode:

```json
{ "env": { "CLAUDE_BUDGET_THRESHOLD": "85", "CLAUDE_SKIP_TEST_FIRST": "1" } }
```

To turn off every hook temporarily, set `"disableAllHooks": true` in `settings.json`.

## Where hooks are configured

| Mode | File | Script path |
|------|------|-------------|
| Plugin | `hooks/hooks.json` in the plugin | `"${CLAUDE_PLUGIN_ROOT}"/scripts/<name>.sh` |
| File-copy, project | `.claude/settings.json` | `"$CLAUDE_PROJECT_DIR"/.claude/scripts/<name>.sh` |
| File-copy, user | `~/.claude/settings.json` | `"$HOME"/.claude/scripts/<name>.sh` |

In file-copy mode, `src/scripts/install-hooks.sh` merges the hooks into your existing `settings.json`. It needs `jq`, backs up the file first, and keeps your permissions and your own hooks. Re-running the installer replaces the kit's hooks instead of duplicating them. That also restores any kit hook you deleted, so use the env-var opt-outs above for hooks you want to keep off. Installer behavior is covered in [INSTALLATION.md](../docs/INSTALLATION.md).

**Plugin mode.** The plugin's `hooks/hooks.json` is global. It applies to the whole session, subagents included, and you can't edit it per project. Use the env-var opt-outs or `disableAllHooks` instead. For what does and doesn't apply in plugin mode, see [plugin-mode.md](https://github.com/stasmarkov/sdd-kit/blob/v2.1.0/docs/reference/plugin-mode.md).

**Drift rule.** `src/settings/settings.template.json` must contain exactly the hooks in `hooks/hooks.json`, differing only in the script path prefix. `./verify.sh` fails the build if they drift. When you add or change a hook, edit both files.

## Notifications

`notify.sh` uses `osascript` on macOS, `notify-send` on Linux (install `libnotify-bin`), and a PowerShell message box on Git Bash/MSYS2/Cygwin. It shows the message and title Claude Code sends with the notification, falling back to "Claude Code needs your attention" when none is given. If `notify-send` is missing it does nothing.

## Stop and SubagentStop checks

Both are `prompt` hooks: a model reviews the context and either allows the stop or blocks it with a reason. A Stop check that keeps blocking would loop forever, so the prompt includes an escape hatch: *"If this is a re-check after a previous stop attempt, allow stopping."* After one round of verification, Claude can always stop. Keep that sentence if you edit the prompt.

## Agent-scoped hooks

Don't put guardrails in agent frontmatter (`hooks:`, `permissionMode:`). Plugin mode ignores those fields without warning, so a guard defined there is off for plugin users. Put guards in the global hooks above, or restrict the agent's `tools`. Details are in [plugin-mode.md](https://github.com/stasmarkov/sdd-kit/blob/v2.1.0/docs/reference/plugin-mode.md).

## Operational scripts

These live in `src/hooks/` (`.claude/hooks/` after a full file-copy install). Run them from the project root.

| Script | Purpose | Wire into |
|--------|---------|-----------|
| `pre-commit.sh` | Pint, PHPStan, and PHP syntax checks for Composer projects; ESLint (advisory only) and `tsc` for npm projects; blocks uppercase markdown filenames under `docs/` and `.ai/` (only `CLAUDE.md` and `README.md` are exempt); warns on debug statements and files over 1 MB | Git pre-commit hook |
| `post-test.sh` | Reads the coverage report and warns below `COVERAGE_THRESHOLD` (default `80`). Flags slow tests | CI after the test step |
| `pre-deploy.sh <env>` | Checks git state, env files, the build, recent test results, pending migrations, and production-only rules | CI/CD before deploy |
| `post-deploy.sh <env> [url]` | Health check, Laravel/Next.js post-deploy tasks, database and cache checks, and a deployment log entry | CI/CD after deploy |

The scripts exit non-zero when a blocking check fails; warnings do not fail them. To wire `pre-commit.sh` into git:

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
exec .claude/hooks/pre-commit.sh
EOF
chmod +x .git/hooks/pre-commit
```

## Checking hooks work

- `/hooks` in a live session lists every active hook and the file it came from.
- `/framework-doctor` (`/sdd-kit:framework-doctor` in plugin mode, where skills are namespaced) checks that the hooks are wired into `settings.json`, that the scripts exist and are executable, and that `block-dangerous.sh` blocks a harmless test payload with exit 2. Nothing gets executed. In plugin mode it skips the wiring check because the hooks come from `hooks/hooks.json`.
- To test one script by hand, pipe JSON into it:

```bash
echo '{"tool_input":{"command":"git push --force origin main"}}' | .claude/scripts/block-dangerous.sh; echo "exit=$?"
```
