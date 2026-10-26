#!/bin/bash
# 50-nextjs.sh - Next.js post-deploy verification (run by post-deploy.sh)
#
# Arguments:
#   $1 - Environment (staging, production)
#   $2 - URL to verify (optional)
#
# Warnings only; this fragment never fails the deployment.

set -e

[ -d ".next" ] || exit 0

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
fi

exit 0
