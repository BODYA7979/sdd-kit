#!/bin/bash
# 50-laravel.sh - Laravel post-deploy tasks and verification (run by post-deploy.sh)
#
# Arguments:
#   $1 - Environment (staging, production)
#   $2 - URL to verify (optional)
#
# Exit 1 when a blocking check fails; warnings do not fail.

set -e

ENVIRONMENT="${1:-staging}"

[ -f "artisan" ] || exit 0

ERRORS=0

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

echo ""
echo "🗄️  Verifying database connection..."

php artisan db:monitor --quiet 2>/dev/null && {
    echo "  ✅ Database connection OK"
} || {
    echo "  ❌ Database connection failed"
    ERRORS=$((ERRORS + 1))
}

echo ""
echo "💾 Verifying cache connection..."

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

[ "$ERRORS" -eq 0 ] || exit 1
exit 0
