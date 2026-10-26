#!/bin/bash
# pre-commit.sh - Run before git commits
#
# Usage: Configure in .claude/settings.json or link to .git/hooks/pre-commit
#
# Runs the stack-neutral checks (documentation filenames, large files), then every
# executable pre-commit.d/*.sh fragment installed by a stack add-on.
#
# Exit codes:
#   0 - All checks passed
#   1 - Checks failed, commit should be blocked

set -e

echo "🔍 Running pre-commit checks..."

STATUS=0

# ============================================================================
# Documentation Checks
# ============================================================================

# Check for uppercase markdown filenames (excluding allowed ones)
echo "🔍 Checking documentation filenames..."
UPPERCASE_DOCS=$(find docs/ .ai/ -name "*.md" -type f 2>/dev/null | \
    grep -v "CLAUDE.md" | \
    grep -v "README.md" | \
    grep '[A-Z]' || true)

if [ -n "$UPPERCASE_DOCS" ]; then
    echo "  ❌ Uppercase markdown filenames found (use lowercase-with-dashes):"
    echo "$UPPERCASE_DOCS" | sed 's/^/    /'
    echo ""
    echo "  Allowed uppercase: CLAUDE.md, README.md"
    echo "  Example: 'API_Design.md' should be 'api-design.md'"
    STATUS=1
else
    echo "  ✅ Documentation filenames OK"
fi

# ============================================================================
# Large Files
# ============================================================================

# Check for large files
echo "🔍 Checking file sizes..."
LARGE_FILES=$(git diff --cached --name-only --diff-filter=ACM | while read FILE; do
    if [ -f "$FILE" ]; then
        SIZE=$(wc -c < "$FILE")
        if [ "$SIZE" -gt 1000000 ]; then  # 1MB
            echo "$FILE ($(($SIZE / 1024 / 1024))MB)"
        fi
    fi
done)

if [ -n "$LARGE_FILES" ]; then
    echo "  ⚠️  Warning: Large files detected:"
    echo "$LARGE_FILES" | sed 's/^/    /'
fi

# ============================================================================
# Stack checks (run-parts)
# ============================================================================
#
# Every executable pre-commit.d/*.sh next to this script runs in LC_ALL=C order,
# in the caller's working directory, with this script's arguments. All fragments
# run even after a failure; the failed ones are named at the end. Add-ons install
# their fragments as NN-<addon>.sh (see src/hooks/README.md).

FRAGMENT_DIR="$(cd "$(dirname "$0")" && pwd)/pre-commit.d"
FRAGMENTS_RUN=0
FAILED_FRAGMENTS=()

if [ -d "$FRAGMENT_DIR" ]; then
    while IFS= read -r FRAGMENT; do
        [ -f "$FRAGMENT" ] || continue
        if [ ! -x "$FRAGMENT" ]; then
            echo "skipped $(basename "$FRAGMENT") (not executable)"
            continue
        fi
        FRAGMENTS_RUN=$((FRAGMENTS_RUN + 1))
        "$FRAGMENT" "$@" || FAILED_FRAGMENTS+=("$(basename "$FRAGMENT")")
    done < <(find "$FRAGMENT_DIR" -maxdepth 1 -name '*.sh' | LC_ALL=C sort)
fi

if [ "$FRAGMENTS_RUN" -eq 0 ]; then
    echo "no stack checks installed"
fi

# ============================================================================
# Result
# ============================================================================

echo ""
if [ ${#FAILED_FRAGMENTS[@]} -gt 0 ]; then
    echo "failed: ${FAILED_FRAGMENTS[*]}"
fi

if [ "$STATUS" -ne 0 ] || [ ${#FAILED_FRAGMENTS[@]} -gt 0 ]; then
    echo "❌ Pre-commit checks failed"
    exit 1
fi

echo "✅ All pre-commit checks passed!"
exit 0
