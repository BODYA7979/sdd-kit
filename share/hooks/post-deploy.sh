#!/bin/bash
# post-deploy.sh - Verify deployment and run post-deployment tasks
#
# Usage: Run after deployment to any environment
#
# Arguments:
#   $1 - Environment (staging, production)
#   $2 - URL to verify (optional)
#
# Exit codes:
#   0 - Deployment verified successfully
#   1 - Deployment verification failed

set -e

ENVIRONMENT="${1:-staging}"
VERIFY_URL="${2:-}"

echo "🔍 Post-deployment verification for: $ENVIRONMENT"
echo "================================================="

ERRORS=0
WARNINGS=0

# ============================================================================
# Health Check
# ============================================================================

if [ -n "$VERIFY_URL" ]; then
    echo ""
    echo "🏥 Running health check..."

    # Basic HTTP check
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$VERIFY_URL/health" 2>/dev/null || echo "000")

    if [ "$HTTP_STATUS" = "200" ]; then
        echo "  ✅ Health endpoint responding (HTTP $HTTP_STATUS)"
    elif [ "$HTTP_STATUS" = "000" ]; then
        echo "  ❌ Health endpoint not reachable"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ⚠️  Health endpoint returned HTTP $HTTP_STATUS"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Response time check
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$VERIFY_URL" 2>/dev/null || echo "0")
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "0")

    echo "  📊 Response time: ${RESPONSE_MS}ms"

    if [ "$(echo "$RESPONSE_TIME > 5" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
        echo "  ⚠️  Warning: Slow response time (>5s)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# ============================================================================
# Laravel-Specific Tasks
# ============================================================================

if [ -f "artisan" ]; then
    echo ""
    echo "🔧 Running Laravel post-deployment tasks..."

    # Clear and cache configurations
    echo "  → Clearing caches..."
    php artisan config:clear --quiet 2>/dev/null || true
    php artisan route:clear --quiet 2>/dev/null || true
    php artisan view:clear --quiet 2>/dev/null || true

    if [ "$ENVIRONMENT" = "production" ]; then
        echo "  → Caching configurations..."
        php artisan config:cache --quiet 2>/dev/null || true
        php artisan route:cache --quiet 2>/dev/null || true
        php artisan view:cache --quiet 2>/dev/null || true
        echo "  ✅ Configurations cached"
    fi

    # Run migrations
    echo "  → Checking migrations..."
    PENDING=$(php artisan migrate:status 2>/dev/null | grep -c "No" || echo "0")
    if [ "$PENDING" != "0" ]; then
        echo "  ⚠️  Running $PENDING pending migrations..."
        php artisan migrate --force --quiet 2>/dev/null || {
            echo "  ❌ Migration failed"
            ERRORS=$((ERRORS + 1))
        }
    fi
    echo "  ✅ Migrations complete"

    # Restart queue workers (if using Horizon)
    if [ -f "vendor/laravel/horizon" ] || grep -q "laravel/horizon" composer.json 2>/dev/null; then
        echo "  → Restarting Horizon..."
        php artisan horizon:terminate --quiet 2>/dev/null || true
        echo "  ✅ Horizon restart signal sent"
    fi
fi

# ============================================================================
# Next.js-Specific Tasks
# ============================================================================

if [ -d ".next" ]; then
    echo ""
    echo "🔧 Verifying Next.js deployment..."

    # Check build ID
    if [ -f ".next/BUILD_ID" ]; then
        BUILD_ID=$(cat .next/BUILD_ID)
        echo "  📌 Build ID: $BUILD_ID"
    fi

    # Check for critical files
    if [ -f ".next/server/pages-manifest.json" ]; then
        echo "  ✅ Pages manifest present"
    else
        echo "  ⚠️  Pages manifest missing"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# ============================================================================
# Database Verification
# ============================================================================

echo ""
echo "🗄️  Verifying database connection..."

if [ -f "artisan" ]; then
    php artisan db:monitor --quiet 2>/dev/null && {
        echo "  ✅ Database connection OK"
    } || {
        echo "  ❌ Database connection failed"
        ERRORS=$((ERRORS + 1))
    }
fi

# ============================================================================
# Cache Verification
# ============================================================================

echo ""
echo "💾 Verifying cache connection..."

if [ -f "artisan" ]; then
    php -r "
        require 'vendor/autoload.php';
        \$app = require_once 'bootstrap/app.php';
        \$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
        \$kernel->bootstrap();
        try {
            Cache::put('deploy_test', 'ok', 10);
            if (Cache::get('deploy_test') === 'ok') {
                echo '  ✅ Cache connection OK' . PHP_EOL;
            }
        } catch (Exception \$e) {
            echo '  ⚠️  Cache connection issue: ' . \$e->getMessage() . PHP_EOL;
        }
    " 2>/dev/null || echo "  ⚠️  Could not verify cache"
fi

# ============================================================================
# Logging
# ============================================================================

echo ""
echo "📝 Recording deployment..."

# Create deployment log entry
DEPLOY_LOG=".deploy-history.log"
DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo "$DEPLOY_TIME | $ENVIRONMENT | $GIT_BRANCH | $GIT_COMMIT | $(whoami)" >> "$DEPLOY_LOG"
echo "  📋 Deployment logged to $DEPLOY_LOG"

# ============================================================================
# Notifications
# ============================================================================

# Uncomment to enable notifications
# if [ -n "$SLACK_WEBHOOK_URL" ]; then
#     curl -X POST -H 'Content-type: application/json' \
#         --data "{\"text\":\"✅ Deployed to $ENVIRONMENT: $GIT_BRANCH@$GIT_COMMIT\"}" \
#         "$SLACK_WEBHOOK_URL"
# fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "================================================="
echo "📊 Post-deployment Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  Commit:      $GIT_COMMIT"
echo "  Branch:      $GIT_BRANCH"
echo "  Errors:      $ERRORS"
echo "  Warnings:    $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "❌ Post-deployment verification FAILED"
    echo "   Check errors above and consider rollback"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo ""
    echo "⚠️  Deployment completed with warnings"
fi

echo ""
echo "✅ Deployment to $ENVIRONMENT verified successfully!"
exit 0
