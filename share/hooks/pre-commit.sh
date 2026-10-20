#!/bin/bash
# pre-commit.sh - Run before git commits
#
# Usage: Configure in .claude/settings.json or link to .git/hooks/pre-commit
#
# Exit codes:
#   0 - All checks passed
#   1 - Checks failed, commit should be blocked

set -e

echo "🔍 Running pre-commit checks..."

# Detect project type
HAS_COMPOSER=false
HAS_NPM=false

[ -f "composer.json" ] && HAS_COMPOSER=true
[ -f "package.json" ] && HAS_NPM=true

# ============================================================================
# PHP/Laravel Checks
# ============================================================================

if [ "$HAS_COMPOSER" = true ]; then
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
fi

# ============================================================================
# JavaScript/TypeScript Checks
# ============================================================================

if [ "$HAS_NPM" = true ]; then
    echo "📦 Node.js project detected"

    # Check for ESLint
    if [ -f "node_modules/.bin/eslint" ]; then
        echo "  → Running ESLint..."
        ./node_modules/.bin/eslint --quiet . 2>/dev/null || true
    fi

    # Check for TypeScript
    if [ -f "node_modules/.bin/tsc" ] && [ -f "tsconfig.json" ]; then
        echo "  → Running TypeScript check..."
        ./node_modules/.bin/tsc --noEmit --quiet 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "  ❌ TypeScript errors found."
            exit 1
        fi
        echo "  ✅ TypeScript OK"
    fi
fi

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
    exit 1
fi
echo "  ✅ Documentation filenames OK"

# ============================================================================
# General Checks
# ============================================================================

# Check for debug statements
echo "🔍 Checking for debug statements..."
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

DEBUG_PATTERNS="console\.log\(|var_dump\(|dd\(|dump\(|print_r\(|debugger;|Ray::send\("

if [ -n "$STAGED_FILES" ]; then
    FOUND_DEBUG=$(echo "$STAGED_FILES" | xargs grep -l -E "$DEBUG_PATTERNS" 2>/dev/null || true)
    if [ -n "$FOUND_DEBUG" ]; then
        echo "  ⚠️  Warning: Debug statements found in:"
        echo "$FOUND_DEBUG" | sed 's/^/    /'
        echo "  Consider removing before commit."
        # Warning only, don't block
    else
        echo "  ✅ No debug statements found"
    fi
fi

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
# Result
# ============================================================================

echo ""
echo "✅ All pre-commit checks passed!"
exit 0
