#!/bin/bash
#
# PreToolUse hook (Bash matcher) - Conventional Commits validator.
#
# When the tool input is a `git commit -m "..."` (or `--message=...`), verify
# the message follows Conventional Commits: type(scope?): subject
# Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci,
#                chore, revert.
#
# Pass-through for non-commit Bash commands.
# Allows merge/revert auto-messages.
#

set -euo pipefail

INPUT=$(cat)

CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
if [[ -z "$CMD" ]]; then
    exit 0
fi

# Only inspect git commit invocations
if ! echo "$CMD" | grep -qE '(^|[[:space:]&|;])git[[:space:]]+commit\b'; then
    exit 0
fi

# Skip if --amend without -m (using $EDITOR) or interactive
if echo "$CMD" | grep -qE '(\-\-amend)([[:space:]]|$)' && ! echo "$CMD" | grep -qE '(\-m|--message)'; then
    exit 0
fi

# Skip merge commits
if echo "$CMD" | grep -qE '(^|[[:space:]])(merge|revert)[[:space:]]'; then
    exit 0
fi

# Extract -m "msg" or --message="msg" (handle single and double quotes and HEREDOC patterns)
MSG=""
# Try -m "..."
MSG=$(echo "$CMD" | sed -nE 's/.*-m[[:space:]]+"([^"]+)".*/\1/p' | head -1)
if [[ -z "$MSG" ]]; then
    MSG=$(echo "$CMD" | sed -nE "s/.*-m[[:space:]]+'([^']+)'.*/\1/p" | head -1)
fi
if [[ -z "$MSG" ]]; then
    MSG=$(echo "$CMD" | sed -nE 's/.*--message=["'"'"']?([^"'"'"']+)["'"'"']?.*/\1/p' | head -1)
fi

# HEREDOC pattern: "$(cat <<'EOF' ... EOF )" — read first non-empty line after cat <<
if [[ -z "$MSG" ]] && echo "$CMD" | grep -qE 'cat[[:space:]]+<<'; then
    MSG=$(echo "$CMD" | awk '/cat[[:space:]]+<<.*EOF/{found=1; next} found && NF{print; exit}')
fi

if [[ -z "$MSG" ]]; then
    # Can't extract — let it pass; commit-msg git hook (if any) will catch.
    exit 0
fi

SUBJECT=$(echo "$MSG" | head -1)

# Conventional Commits regex
CC_RE='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9_./-]+\))?!?:[[:space:]]+.+'

if ! echo "$SUBJECT" | grep -qE "$CC_RE"; then
    echo "Blocked: commit subject does not follow Conventional Commits." >&2
    echo "  Subject: $SUBJECT" >&2
    echo "  Required form: type(scope?): subject" >&2
    echo "  Types: feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert" >&2
    echo "  Example: feat(auth): add OAuth2 callback handler" >&2
    exit 2
fi

# Subject length <= 72
LEN=${#SUBJECT}
if (( LEN > 72 )); then
    echo "Blocked: commit subject is $LEN chars (limit 72). Tighten or move detail to the body." >&2
    exit 2
fi

exit 0
