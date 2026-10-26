#!/bin/bash
# 50-laravel.sh - Laravel pre-deploy checks (run by pre-deploy.sh)
#
# Arguments:
#   $1 - Environment (staging, production)
#
# Exit 1 when a blocking check fails; warnings do not fail.

set -e

ENVIRONMENT="${1:-staging}"
ERRORS=0

# PHP: Check autoload
if [ -f "composer.json" ]; then
    echo ""
    echo "🔨 Checking PHP build artifacts..."
    if [ ! -d "vendor" ]; then
        echo "  ❌ Vendor directory missing - run 'composer install'"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ✅ Composer dependencies installed"
    fi
fi

# Database migrations
if [ -f "artisan" ]; then
    echo ""
    echo "🗄️  Checking database migrations..."
    # Check for pending migrations (dry run)
    PENDING=$(php artisan migrate:status 2>/dev/null | grep -c "No" || echo "0")
    if [ "$PENDING" != "0" ]; then
        echo "  ⚠️  Warning: $PENDING pending migrations"
    else
        echo "  ✅ All migrations applied"
    fi
fi

# Production-specific checks
if [ "$ENVIRONMENT" = "production" ]; then
    echo ""
    echo "🔒 Laravel production checks..."

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

[ "$ERRORS" -eq 0 ] || exit 1
exit 0
