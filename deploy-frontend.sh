#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy-frontend.sh – Sync CalcPro frontend to S3 + invalidate CloudFront
#
# Usage:
#   ./deploy-frontend.sh
#
# Prerequisites:
#   - AWS CLI installed & configured (aws configure)
#   - S3_BUCKET and CLOUDFRONT_ID set below (or as environment variables)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
S3_BUCKET="${S3_BUCKET:-YOUR_S3_BUCKET_NAME}"
CLOUDFRONT_ID="${CLOUDFRONT_ID:-YOUR_CLOUDFRONT_DISTRIBUTION_ID}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Frontend files (relative to repo root)
FRONTEND_DIR="."
FRONTEND_FILES=("index.html" "style.css" "app.js")

# ── Validate ──────────────────────────────────────────────────────────────────
if [[ "$S3_BUCKET" == "YOUR_S3_BUCKET_NAME" ]]; then
  echo "❌  ERROR: Set S3_BUCKET to your bucket name first."
  echo "   export S3_BUCKET=my-calcpro-frontend"
  exit 1
fi

echo "🚀  Deploying CalcPro frontend to S3..."
echo "    Bucket:      s3://${S3_BUCKET}"
echo "    CloudFront:  ${CLOUDFRONT_ID}"
echo ""

# ── Upload HTML (no cache – always fresh) ─────────────────────────────────────
aws s3 cp "${FRONTEND_DIR}/index.html" "s3://${S3_BUCKET}/index.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --region "${AWS_REGION}"
echo "  ✅  index.html uploaded"

# ── Upload CSS (cache 7 days) ─────────────────────────────────────────────────
aws s3 cp "${FRONTEND_DIR}/style.css" "s3://${S3_BUCKET}/style.css" \
  --content-type "text/css; charset=utf-8" \
  --cache-control "public, max-age=604800" \
  --region "${AWS_REGION}"
echo "  ✅  style.css uploaded"

# ── Upload JS (cache 7 days) ──────────────────────────────────────────────────
aws s3 cp "${FRONTEND_DIR}/app.js" "s3://${S3_BUCKET}/app.js" \
  --content-type "application/javascript; charset=utf-8" \
  --cache-control "public, max-age=604800" \
  --region "${AWS_REGION}"
echo "  ✅  app.js uploaded"

# ── Invalidate CloudFront cache ───────────────────────────────────────────────
if [[ "$CLOUDFRONT_ID" != "YOUR_CLOUDFRONT_DISTRIBUTION_ID" ]]; then
  echo ""
  echo "⏳  Invalidating CloudFront cache..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_ID}" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)
  echo "  ✅  Invalidation created: ${INVALIDATION_ID}"
  echo "      (Takes ~30–60 seconds to propagate globally)"
else
  echo "⚠️   Skipping CloudFront invalidation (CLOUDFRONT_ID not set)"
fi

echo ""
echo "✅  Frontend deployed successfully!"
echo "    URL: https://${CLOUDFRONT_ID}.cloudfront.net  (or your custom domain)"
