#!/bin/bash
# 50-laravel.sh - Laravel pre-commit checks (run by pre-commit.sh)
#
# Receives the dispatcher's arguments. Runs in the caller's working directory.
# Exit 1 blocks the commit; debug statements only warn.

set -e

[ -f "composer.json" ] || exit 0

echo "📦 PHP project detected"

# Check for Pint (code style)
if [ -f "vendor/bin/pint" ]; then
    echo "  → Running Laravel Pint..."
    ./vendor/bin/pint --test --quiet
    if [ $? -ne 0 ]; then
        echo "  ❌ Code style issues found. Run 'vendor/bin/pint' to fix."
        exit 1
    fi
    echo "  ✅ Code style OK"
fi

# Check for PHPStan (static analysis)
if [ -f "vendor/bin/phpstan" ]; then
    echo "  → Running PHPStan..."
    ./vendor/bin/phpstan analyse --no-progress --quiet 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "  ❌ Static analysis issues found."
        exit 1
    fi
    echo "  ✅ Static analysis OK"
fi

# PHP syntax check on staged files
STAGED_PHP=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.php$' || true)
if [ -n "$STAGED_PHP" ]; then
    echo "  → Checking PHP syntax..."
    for FILE in $STAGED_PHP; do
        php -l "$FILE" > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            echo "  ❌ PHP syntax error in $FILE"
            exit 1
        fi
    done
    echo "  ✅ PHP syntax OK"
fi

# Debug statements: warning only, never blocks
echo "🔍 Checking for PHP debug statements..."
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

DEBUG_PATTERNS="var_dump\(|dd\(|dump\(|print_r\(|Ray::send\("

if [ -n "$STAGED_FILES" ]; then
    FOUND_DEBUG=$(echo "$STAGED_FILES" | xargs grep -l -E "$DEBUG_PATTERNS" 2>/dev/null || true)
    if [ -n "$FOUND_DEBUG" ]; then
        echo "  ⚠️  Warning: Debug statements found in:"
        echo "$FOUND_DEBUG" | sed 's/^/    /'
        echo "  Consider removing before commit."
    else
        echo "  ✅ No debug statements found"
    fi
fi

exit 0
