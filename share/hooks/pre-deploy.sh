#!/bin/bash
# pre-deploy.sh - Validate before deployment
#
# Usage: Run before deploying to any environment
#
# Arguments:
#   $1 - Environment (staging, production)
#
# Runs the stack-neutral checks (git state, env files, secrets, test results), then
# every executable pre-deploy.d/*.sh fragment installed by a stack add-on.
#
# Exit codes:
#   0 - Ready to deploy
#   1 - Deployment should be blocked

set -e

ENVIRONMENT="${1:-staging}"

echo "🚀 Pre-deployment validation for: $ENVIRONMENT"
echo "=============================================="

ERRORS=0
WARNINGS=0

# ============================================================================
# Git State Checks
# ============================================================================

echo ""
echo "📦 Checking Git state..."

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "  ❌ Uncommitted changes detected"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ Working directory clean"
fi

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  📌 Current branch: $CURRENT_BRANCH"

if [ "$ENVIRONMENT" = "production" ]; then
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        echo "  ⚠️  Warning: Deploying to production from non-main branch"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check if branch is up to date
git fetch origin --quiet 2>/dev/null || true
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "")

if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    echo "  ⚠️  Warning: Branch is not up to date with origin"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================================================
# Environment Configuration
# ============================================================================

echo ""
echo "⚙️  Checking environment configuration..."

# Check for required env files
if [ "$ENVIRONMENT" = "production" ]; then
    if [ ! -f ".env.production" ] && [ ! -f ".env" ]; then
        echo "  ⚠️  Warning: No .env.production file found"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check for sensitive data in committed files
SENSITIVE_PATTERNS="password=|secret=|api_key=|private_key"
FOUND_SECRETS=$(git diff --cached --name-only | xargs grep -l -i -E "$SENSITIVE_PATTERNS" 2>/dev/null || true)
if [ -n "$FOUND_SECRETS" ]; then
    echo "  ❌ Potential secrets found in committed files:"
    echo "$FOUND_SECRETS" | sed 's/^/      /'
    ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# Test Validation
# ============================================================================

echo ""
echo "🧪 Checking test status..."

# Check if tests passed recently
if [ -f "test-results.xml" ]; then
    # Check file age (less than 1 hour)
    if [ "$(find test-results.xml -mmin -60 2>/dev/null)" ]; then
        echo "  ✅ Recent test results found"
    else
        echo "  ⚠️  Warning: Test results are stale"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ⚠️  Warning: No test results file found"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================================================
# Stack checks (run-parts)
# ============================================================================
#
# Every executable pre-deploy.d/*.sh next to this script runs in LC_ALL=C order,
# in the caller's working directory, with this script's arguments. All fragments
# run even after a failure; the failed ones are named at the end. Add-ons install
# their fragments as NN-<addon>.sh (see src/hooks/README.md).

FRAGMENT_DIR="$(cd "$(dirname "$0")" && pwd)/pre-deploy.d"
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
    echo ""
    echo "failed: ${FAILED_FRAGMENTS[*]}"
    ERRORS=$((ERRORS + ${#FAILED_FRAGMENTS[@]}))
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "=============================================="
echo "📊 Validation Summary:"
echo "  Errors:   $ERRORS"
echo "  Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "❌ Pre-deployment validation FAILED"
    echo "   Fix errors before deploying to $ENVIRONMENT"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo ""
    echo "⚠️  Pre-deployment validation passed with warnings"
    echo "   Review warnings before proceeding"
fi

echo ""
echo "✅ Pre-deployment validation PASSED"
echo "   Ready to deploy to $ENVIRONMENT"
exit 0
