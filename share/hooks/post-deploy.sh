#!/bin/bash
# post-deploy.sh - Verify deployment and run post-deployment tasks
#
# Usage: Run after deployment to any environment
#
# Arguments:
#   $1 - Environment (staging, production)
#   $2 - URL to verify (optional)
#
# Runs the stack-neutral health check, then every executable post-deploy.d/*.sh
# fragment installed by a stack add-on, then records the deployment.
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
# Stack checks (run-parts)
# ============================================================================
#
# Every executable post-deploy.d/*.sh next to this script runs in LC_ALL=C order,
# in the caller's working directory, with this script's arguments. All fragments
# run even after a failure; the failed ones are named at the end. Add-ons install
# their fragments as NN-<addon>.sh (see src/hooks/README.md).

FRAGMENT_DIR="$(cd "$(dirname "$0")" && pwd)/post-deploy.d"
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
