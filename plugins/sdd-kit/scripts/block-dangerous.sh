#!/bin/bash
#
# PreToolUse hook (Bash matcher) - Block dangerous commands
#
# Receives JSON on stdin with tool_name and tool_input fields.
# Exit 0 to allow, exit 2 to block (stderr shown to Claude).
#

set -euo pipefail

INPUT=$(cat)

# Extract the command from tool_input.command
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
    exit 0
fi

# Keep patterns portable (POSIX classes, no empty alternatives): macOS grep rejects
# `(a|)`, and a grep error inside `if` reads as "no match" — silently allowing the command.

# Block rm targeting / or /* (but not ordinary absolute paths like /tmp/x)
if echo "$COMMAND" | grep -qE 'rm[[:space:]]+(-[-a-zA-Z]+[[:space:]]+)*/\*?([[:space:]]|$|[;&|])'; then
    echo "Blocked: recursive delete of root filesystem is not allowed." >&2
    exit 2
fi

# Block force push to main/master
if echo "$COMMAND" | grep -qE 'git[[:space:]]+push[[:space:]]+.*--force.*[[:space:]]+(main|master)'; then
    echo "Blocked: force push to main/master. Use a feature branch instead." >&2
    exit 2
fi
if echo "$COMMAND" | grep -qE 'git[[:space:]]+push[[:space:]]+-f[[:space:]]+.*[[:space:]]+(main|master)'; then
    echo "Blocked: force push to main/master. Use a feature branch instead." >&2
    exit 2
fi

# Block drop database
if echo "$COMMAND" | grep -qiE '(drop[[:space:]]+database|dropdb)[[:space:]]'; then
    echo "Blocked: dropping databases requires manual confirmation." >&2
    exit 2
fi

exit 0
