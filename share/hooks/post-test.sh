#!/bin/bash
# post-test.sh - Run after test execution
#
# Usage: Configure in .claude/settings.json PostToolUse hook
#
# Environment variables:
#   CLAUDE_STATUS - Test result (success/failure)
#   TEST_COVERAGE - Coverage percentage (if available)
#
# Runs the stack-neutral result checks, then every executable post-test.d/*.sh
# fragment installed by a stack add-on (coverage and slow-test analysis).

set -e

echo "📊 Post-test analysis..."

# ============================================================================
# Test Results Summary
# ============================================================================

# Check for test result files
if [ -f "test-results.xml" ] || [ -f "junit.xml" ]; then
    echo "  📋 Test results file found"
fi

# ============================================================================
# Stack checks (run-parts)
# ============================================================================
#
# Every executable post-test.d/*.sh next to this script runs in LC_ALL=C order,
# in the caller's working directory, with this script's arguments. All fragments
# run even after a failure; the failed ones are named at the end. Add-ons install
# their fragments as NN-<addon>.sh (see src/hooks/README.md).

FRAGMENT_DIR="$(cd "$(dirname "$0")" && pwd)/post-test.d"
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

if [ ${#FAILED_FRAGMENTS[@]} -gt 0 ]; then
    echo "failed: ${FAILED_FRAGMENTS[*]}"
fi

# ============================================================================
# Notifications (optional)
# ============================================================================

# Uncomment to enable Slack notifications
# if [ -n "$SLACK_WEBHOOK_URL" ]; then
#     if [ "$CLAUDE_STATUS" = "failure" ]; then
#         curl -X POST -H 'Content-type: application/json' \
#             --data '{"text":"❌ Tests failed in CI"}' \
#             "$SLACK_WEBHOOK_URL"
#     fi
# fi

if [ ${#FAILED_FRAGMENTS[@]} -gt 0 ]; then
    exit 1
fi

echo "✅ Post-test analysis complete"
exit 0
