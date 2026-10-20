#!/bin/bash
# pre-deploy.sh - Validate before deployment
#
# Usage: Run before deploying to any environment
#
# Arguments:
#   $1 - Environment (staging, production)
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
# Build Validation
# ============================================================================

echo ""
echo "🔨 Checking build artifacts..."

# PHP: Check autoload
if [ -f "composer.json" ]; then
    if [ ! -d "vendor" ]; then
        echo "  ❌ Vendor directory missing - run 'composer install'"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ✅ Composer dependencies installed"
    fi
fi

# Node: Check node_modules and build
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "  ❌ node_modules missing - run 'npm install'"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for built assets
    if [ -d ".next" ] || [ -d "dist" ] || [ -d "build" ]; then
        echo "  ✅ Build artifacts present"
    else
        echo "  ⚠️  Warning: No build artifacts found - may need 'npm run build'"
        WARNINGS=$((WARNINGS + 1))
    fi
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
# Database Migration Check
# ============================================================================

echo ""
echo "🗄️  Checking database migrations..."

if [ -f "artisan" ]; then
    # Check for pending migrations (dry run)
    PENDING=$(php artisan migrate:status 2>/dev/null | grep -c "No" || echo "0")
    if [ "$PENDING" != "0" ]; then
        echo "  ⚠️  Warning: $PENDING pending migrations"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✅ All migrations applied"
    fi
fi

# ============================================================================
# Production-Specific Checks
# ============================================================================

if [ "$ENVIRONMENT" = "production" ]; then
    echo ""
    echo "🔒 Production-specific checks..."

    # Check debug mode
    if grep -q "APP_DEBUG=true" .env 2>/dev/null; then
        echo "  ❌ APP_DEBUG=true in .env (should be false for production)"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for development dependencies
    if [ -f "composer.json" ]; then
        DEV_DEPS=$(cat composer.json | grep -c '"require-dev"' || echo "0")
        if [ "$DEV_DEPS" != "0" ]; then
            echo "  ⚠️  Remember to use --no-dev for production deployment"
        fi
    fi
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
