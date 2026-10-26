#!/bin/bash
# 50-nextjs.sh - Jest/Vitest coverage analysis (run by post-test.sh)
#
# Environment variables:
#   COVERAGE_THRESHOLD - Minimum coverage percentage (default 80)

set -e

COVERAGE_PCT=0

# Jest coverage
if [ -f "coverage/coverage-summary.json" ]; then
    COVERAGE_FILE="coverage/coverage-summary.json"
    if command -v node &> /dev/null; then
        COVERAGE_PCT=$(node -e "
            const data = require('./$COVERAGE_FILE');
            process.stdout.write(String(data.total?.lines?.pct || 0));
        " 2>/dev/null || echo "0")
    fi

    echo "  📈 Coverage: ${COVERAGE_PCT}%"

    # Coverage threshold check
    THRESHOLD=${COVERAGE_THRESHOLD:-80}
    if [ "$(echo "$COVERAGE_PCT < $THRESHOLD" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
        echo "  ⚠️  Coverage below threshold (${THRESHOLD}%)"
    else
        echo "  ✅ Coverage meets threshold"
    fi
fi

exit 0
