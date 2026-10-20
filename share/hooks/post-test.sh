#!/bin/bash
# post-test.sh - Run after test execution
#
# Usage: Configure in .claude/settings.json PostToolUse hook
#
# Environment variables:
#   CLAUDE_STATUS - Test result (success/failure)
#   TEST_COVERAGE - Coverage percentage (if available)

set -e

echo "📊 Post-test analysis..."

# ============================================================================
# Coverage Report
# ============================================================================

# Check for coverage reports
COVERAGE_FILE=""
COVERAGE_PCT=0

# PHPUnit/Pest coverage
if [ -f "coverage/clover.xml" ]; then
    COVERAGE_FILE="coverage/clover.xml"
    # Extract coverage from clover.xml
    if command -v php &> /dev/null; then
        COVERAGE_PCT=$(php -r "
            \$xml = simplexml_load_file('$COVERAGE_FILE');
            \$metrics = \$xml->project->metrics;
            \$covered = (int)\$metrics['coveredstatements'];
            \$total = (int)\$metrics['statements'];
            echo \$total > 0 ? round((\$covered / \$total) * 100, 1) : 0;
        " 2>/dev/null || echo "0")
    fi
fi

# Jest coverage
if [ -f "coverage/coverage-summary.json" ]; then
    COVERAGE_FILE="coverage/coverage-summary.json"
    if command -v node &> /dev/null; then
        COVERAGE_PCT=$(node -e "
            const data = require('./$COVERAGE_FILE');
            process.stdout.write(String(data.total?.lines?.pct || 0));
        " 2>/dev/null || echo "0")
    fi
fi

if [ -n "$COVERAGE_FILE" ]; then
    echo "  📈 Coverage: ${COVERAGE_PCT}%"

    # Coverage threshold check
    THRESHOLD=${COVERAGE_THRESHOLD:-80}
    if [ "$(echo "$COVERAGE_PCT < $THRESHOLD" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
        echo "  ⚠️  Coverage below threshold (${THRESHOLD}%)"
    else
        echo "  ✅ Coverage meets threshold"
    fi
fi

# ============================================================================
# Test Results Summary
# ============================================================================

# Check for test result files
if [ -f "test-results.xml" ] || [ -f "junit.xml" ]; then
    echo "  📋 Test results file found"
fi

# ============================================================================
# Slow Test Detection
# ============================================================================

# If using Pest, check for slow tests
if [ -f "storage/logs/pest-profile.json" ]; then
    echo "  🐢 Slow tests detected - check pest-profile.json"
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

echo "✅ Post-test analysis complete"
exit 0
