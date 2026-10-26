#!/bin/bash
# 50-nextjs.sh - Next.js pre-deploy checks (run by pre-deploy.sh)
#
# Arguments:
#   $1 - Environment (staging, production)
#
# Exit 1 when a blocking check fails; warnings do not fail.

set -e

[ -f "package.json" ] || exit 0

ERRORS=0

echo ""
echo "🔨 Checking Node build artifacts..."

if [ ! -d "node_modules" ]; then
    echo "  ❌ node_modules missing - run 'npm install'"
    ERRORS=$((ERRORS + 1))
fi

# Check for built assets
if [ -d ".next" ] || [ -d "dist" ] || [ -d "build" ]; then
    echo "  ✅ Build artifacts present"
else
    echo "  ⚠️  Warning: No build artifacts found - may need 'npm run build'"
fi

[ "$ERRORS" -eq 0 ] || exit 1
exit 0
