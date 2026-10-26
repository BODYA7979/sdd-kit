#!/bin/bash
# 50-nextjs.sh - Next.js pre-commit checks (run by pre-commit.sh)
#
# Receives the dispatcher's arguments. Runs in the caller's working directory.
# Exit 1 blocks the commit; ESLint output and debug statements only warn.

set -e

[ -f "package.json" ] || exit 0

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

# Debug statements: warning only, never blocks
echo "🔍 Checking for JS debug statements..."
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

DEBUG_PATTERNS="console\.log\(|debugger;"

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
