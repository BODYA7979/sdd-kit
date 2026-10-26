#!/bin/bash
#
# PreToolUse hook (Bash matcher) - Block dangerous commands and shell writes to the stack trust store
#
# Receives JSON on stdin with tool_name and tool_input fields; agent_id is present when the
# call comes from a subagent (workflow agents included).
# Exit 0 to allow, exit 2 to block (stderr shown to Claude).
#

set -euo pipefail

INPUT=$(cat)

# Only /stack-trust, run by the user in the main session, may change
# <home>/.claude/sdd-kit/trusted-stacks.json (<home> from the OS user database): an approval lets a stack
# manifest's commands run on this machine, so an agent acting on repo content must not grant one.
STORE_NAME='trusted-stacks.json'
STORE_FIX="Only /stack-trust may change the trust store, after the user reviews the manifest. Fix: ask the user to run /stack-trust."

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
    exit 0
fi

AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // empty')
if [[ -n "$AGENT_ID" ]] && echo "$COMMAND" | grep -qE 'trust-store\.mjs' && echo "$COMMAND" | grep -qE -- '--approve'; then
    echo "Blocked: a subagent tried to approve a stack manifest. $STORE_FIX" >&2
    exit 2
fi

# Reading the store (cat, jq, head, test -f) stays allowed: Detect returns its text to the workflow.
# Anything that could write it is refused: an output redirect other than to /dev/null or a
# descriptor, a command that copies, moves, deletes or edits in place, or inline code (-e, -c, --eval).
if echo "$COMMAND" | grep -qF "$STORE_NAME"; then
    STRIPPED=$(echo "$COMMAND" | sed -E 's#[0-9]*>>?[[:space:]]*/dev/null##g; s#[0-9]*>&[0-9-]##g; s#(test|\[)[[:space:]]+-[a-z]([[:space:]])#\1 \2#g')
    if echo "$STRIPPED" | grep -qE '>' \
        || echo "$STRIPPED" | grep -qE '(^|[^[:alnum:]_.-])(tee|cp|mv|rm|ln|install|rsync|truncate|dd|touch|chmod|chown|ed|ex|vi|vim|nano)([[:space:]]|$)' \
        || echo "$STRIPPED" | grep -qE '[[:space:]](-e|-c|-p|--eval|--print)([[:space:]]|$)' \
        || echo "$STRIPPED" | grep -qE '(^|[[:space:]])(sed|gsed)[[:space:]].*-i'; then
        echo "Blocked: shell command that could write the stack trust store. $STORE_FIX" >&2
        exit 2
    fi
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
