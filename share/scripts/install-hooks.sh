#!/bin/bash
#
# Merge the framework's lifecycle hooks into a Claude Code settings.json.
#
# Usage:
#   install-hooks.sh <settings.template.json> <settings.json> <project|user>
#
# - Missing settings.json: created from the template.
# - Existing settings.json: backed up, then framework hooks are merged in.
#   Everything else (permissions, env, model, user-defined hooks) is preserved.
# - Re-running is idempotent: framework-owned hooks from a previous install are
#   replaced, not duplicated. Ownership = a command pointing at one of the
#   framework's script names under .claude/scripts/ (current or retired), or an
#   identical prompt hook. Retired hooks are removed, not re-added.
#
# In "user" mode, hook commands point at ~/.claude/scripts so they fire in every
# project; "project" mode keeps $CLAUDE_PROJECT_DIR/.claude/scripts.

set -euo pipefail

# Hook scripts removed from the framework; existing installs still reference them.
RETIRED_SCRIPTS='["kg-capture.sh"]'
# Earlier wordings of framework prompt hooks, replaced rather than duplicated.
RETIRED_PROMPTS='["Before ending, verify: (1) All tasks marked as completed have passing tests, (2) No uncommitted changes are left without explanation, (3) Session state is saved if mid-spec. If this is a re-check after a previous stop attempt, allow stopping. Context: $ARGUMENTS"]'

TEMPLATE="${1:?template path required}"
SETTINGS="${2:?settings.json path required}"
MODE="${3:?mode required (project|user)}"

if ! command -v jq >/dev/null 2>&1; then
    echo "install-hooks: jq is required (the hook scripts depend on it too)." >&2
    echo "  Install it (brew install jq / apt-get install jq) and re-run the installer." >&2
    exit 1
fi

if [[ ! -f "$TEMPLATE" ]]; then
    echo "install-hooks: template not found: $TEMPLATE" >&2
    exit 1
fi

case "$MODE" in
    project) prefix='"$CLAUDE_PROJECT_DIR"/.claude/scripts/' ;;
    user)    prefix='"$HOME"/.claude/scripts/' ;;
    *) echo "install-hooks: mode must be 'project' or 'user', got '$MODE'" >&2; exit 1 ;;
esac

framework=$(jq --arg prefix "$prefix" '
    walk(if type == "object" and has("command")
         then .command |= sub("^\"\\$CLAUDE_PROJECT_DIR\"/\\.claude/scripts/"; $prefix)
         else . end)
' "$TEMPLATE")

mkdir -p "$(dirname "$SETTINGS")"

if [[ ! -f "$SETTINGS" ]]; then
    printf '%s\n' "$framework" > "$SETTINGS"
    echo "created"
    exit 0
fi

if ! jq empty "$SETTINGS" 2>/dev/null; then
    echo "install-hooks: $SETTINGS is not valid JSON; left untouched." >&2
    echo "  Fix the file, then re-run the installer to add hooks." >&2
    exit 1
fi

backup="$SETTINGS.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SETTINGS" "$backup"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
jq --argjson fw "$framework" --argjson retired "$RETIRED_SCRIPTS" --argjson retiredPrompts "$RETIRED_PROMPTS" '
    def script_names:
        [ $fw.hooks[][].hooks[]
          | select(.type == "command")
          | .command
          | capture("scripts/(?<n>[A-Za-z0-9_.-]+\\.sh)").n ] + $retired | unique;
    def prompts:
        [ $fw.hooks[][].hooks[] | select(.type == "prompt") | .prompt ] + $retiredPrompts;
    def owned($names; $prompts):
        (.type == "command" and ((.command // "") as $c
            | any($names[]; . as $n | $c | contains(".claude/scripts/" + $n))))
        or (.type == "prompt" and (.prompt as $p | any($prompts[]; . == $p)));

    script_names as $names
    | prompts as $prompts
    | .hooks = ((.hooks // {})
        | map_values(map(.hooks |= map(select(owned($names; $prompts) | not)))
                     | map(select(.hooks | length > 0)))
        | with_entries(select(.value | length > 0)))
    | reduce ($fw.hooks | to_entries[]) as $e (.;
        .hooks[$e.key] = ((.hooks[$e.key] // []) + $e.value))
' "$SETTINGS" > "$tmp"

# Write through rather than mv: keeps permissions and any dotfiles symlink.
cat "$tmp" > "$SETTINGS"
echo "merged (backup: $backup)"
