#!/bin/bash
#
# Install the pinned third-party skills listed in a manifest, and print the
# commands for recommended plugins.
#
# Usage:
#   install-third-party.sh <third-party.json> <skills-dir> [--dry-run]
#
# Only entries with "status": "pinned" are installed: the upstream repo is
# fetched at the exact commit in "ref", the skill directory at "path" is copied
# to <skills-dir>/<name>, and the upstream LICENSE is copied alongside it.
# Nothing from the fetched repo is executed. Entries marked "unverified" (no
# licensed source) or "manual" (reviewed, but left to the user) are listed and
# skipped. Plugins are never installed automatically.

set -euo pipefail

MANIFEST="${1:?manifest path required}"
SKILLS_DIR="${2:?skills dir required}"
DRY_RUN="${3:-}"

for tool in jq git; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "install-third-party: $tool is required." >&2
        exit 1
    fi
done

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

jq -c '.skills[]' "$MANIFEST" | while read -r entry; do
    name=$(jq -r '.name' <<<"$entry")
    status=$(jq -r '.status' <<<"$entry")
    if [[ "$status" == "manual" ]]; then
        echo "skip   $name (manual: reviewed, install by hand; see docs/third-party.md)"
        continue
    fi
    if [[ "$status" != "pinned" ]]; then
        echo "skip   $name ($status: no verified, licensed upstream source)"
        continue
    fi

    source=$(jq -r '.source' <<<"$entry")
    ref=$(jq -r '.ref' <<<"$entry")
    path=$(jq -r '.path' <<<"$entry")
    if [[ ! "$ref" =~ ^[0-9a-f]{40}$ ]]; then
        echo "skip   $name (ref is not a full commit SHA: $ref)" >&2
        continue
    fi

    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        echo "would  $name ← $source @ ${ref:0:12} ($path)"
        continue
    fi

    repo="$work/$name"
    git clone -q --filter=blob:none --no-checkout "$source" "$repo"
    git -C "$repo" -c advice.detachedHead=false checkout -q "$ref" -- "$path"
    git -C "$repo" checkout -q "$ref" -- LICENSE 2>/dev/null || true

    target="$SKILLS_DIR/$name"
    if [[ -e "$target" ]]; then
        mv "$target" "$target.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    mkdir -p "$SKILLS_DIR"
    cp -R "$repo/$path" "$target"
    [[ -f "$repo/LICENSE" ]] && cp "$repo/LICENSE" "$target/LICENSE"
    printf '%s\n' "$source@$ref" > "$target/.source"
    echo "ok     $name ← $source @ ${ref:0:12}"
done

echo
echo "Recommended plugins (review, then install yourself):"
jq -r '.plugins[]
    | (if .marketplaceSource then "  claude plugin marketplace add \(.marketplaceSource)\n" else "" end)
      + "  claude plugin install \(.name)@\(.marketplace)"
      + (if .version then "    # reviewed at \(.version)" else "" end)' "$MANIFEST"
