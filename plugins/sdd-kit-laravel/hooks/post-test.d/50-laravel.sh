#!/bin/bash
# 50-laravel.sh - PHPUnit/Pest coverage and slow-test analysis (run by post-test.sh)
#
# Environment variables:
#   COVERAGE_THRESHOLD - Minimum coverage percentage (default 80)

set -e

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

    echo "  📈 Coverage: ${COVERAGE_PCT}%"

    # Coverage threshold check
    THRESHOLD=${COVERAGE_THRESHOLD:-80}
    if [ "$(echo "$COVERAGE_PCT < $THRESHOLD" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
        echo "  ⚠️  Coverage below threshold (${THRESHOLD}%)"
    else
        echo "  ✅ Coverage meets threshold"
    fi
fi

# If using Pest, check for slow tests
if [ -f "storage/logs/pest-profile.json" ]; then
    echo "  🐢 Slow tests detected - check pest-profile.json"
fi

exit 0
