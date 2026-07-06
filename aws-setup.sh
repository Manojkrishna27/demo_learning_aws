#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# aws-setup.sh – One-shot AWS infrastructure bootstrap for CalcPro
#
# What this script creates:
#   1. S3 bucket (frontend static hosting)
#   2. CloudFront distribution pointing to S3
#   3. RDS PostgreSQL instance (db.t3.micro)
#   4. Elastic Beanstalk application + environment
#
# Prerequisites:
#   - AWS CLI v2 installed: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
#   - EB CLI installed: pip install awsebcli
#   - AWS configured: aws configure
#   - Edit the VARIABLES section below before running
#
# Usage:
#   chmod +x aws-setup.sh
#   ./aws-setup.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─────────────────────────────────────────────────────────────
#  EDIT THESE VARIABLES BEFORE RUNNING
# ─────────────────────────────────────────────────────────────
APP_NAME="calcpro"
AWS_REGION="us-east-1"                  # Change to your preferred region
S3_BUCKET="${APP_NAME}-frontend-$(date +%s)"   # Unique bucket name
DB_INSTANCE_ID="${APP_NAME}-db"
DB_NAME="calcpro_db"
DB_USER="calcpro_user"
DB_PASSWORD="minical!"  # ← CHANGE THIS
SECRET_KEY="CHANGE_ME_$(openssl rand -hex 24)"
EB_APP_NAME="${APP_NAME}-backend"
EB_ENV_NAME="${APP_NAME}-prod"
# ─────────────────────────────────────────────────────────────

echo "╔══════════════════════════════════════════════════╗"
echo "║   CalcPro – AWS Infrastructure Bootstrap         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Region: ${AWS_REGION}"
echo "S3 Bucket: ${S3_BUCKET}"
echo ""

# ── Step 1: S3 Bucket for Frontend ───────────────────────────
echo "📦  [1/5] Creating S3 bucket for frontend..."
aws s3api create-bucket \
  --bucket "${S3_BUCKET}" \
  --region "${AWS_REGION}" \
  $([ "${AWS_REGION}" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=${AWS_REGION}") \
  2>/dev/null || echo "  (bucket may already exist)"

# Remove public access block to allow static website hosting
aws s3api put-public-access-block \
  --bucket "${S3_BUCKET}" \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Bucket policy – public read
aws s3api put-bucket-policy \
  --bucket "${S3_BUCKET}" \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::'"${S3_BUCKET}"'/*"
    }]
  }'

# Enable static website hosting
aws s3 website "s3://${S3_BUCKET}/" \
  --index-document index.html \
  --error-document index.html

echo "  ✅  S3 bucket created: ${S3_BUCKET}"

# ── Step 2: Upload Frontend Files ────────────────────────────
echo "🌐  [2/5] Uploading frontend files to S3..."
aws s3 cp index.html "s3://${S3_BUCKET}/index.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache" --region "${AWS_REGION}"
aws s3 cp style.css  "s3://${S3_BUCKET}/style.css"  \
  --content-type "text/css" \
  --cache-control "public, max-age=604800" --region "${AWS_REGION}"
aws s3 cp app.js     "s3://${S3_BUCKET}/app.js"     \
  --content-type "application/javascript" \
  --cache-control "public, max-age=604800" --region "${AWS_REGION}"
echo "  ✅  Frontend uploaded"

S3_WEBSITE_URL="http://${S3_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"
echo "  🔗  S3 Website: ${S3_WEBSITE_URL}"

# ── Step 3: CloudFront Distribution ──────────────────────────
echo "☁️   [3/5] Creating CloudFront distribution..."
CF_ORIGIN="${S3_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"

CF_DISTRIBUTION=$(aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "calcpro-'"$(date +%s)"'",
    "Comment": "CalcPro frontend CDN",
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-'"${S3_BUCKET}"'",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] },
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "Compress": true
    },
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "S3-'"${S3_BUCKET}"'",
        "DomainName": "'"${CF_ORIGIN}"'",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }]
    },
    "Enabled": true,
    "DefaultRootObject": "index.html",
    "CustomErrorResponses": {
      "Quantity": 1,
      "Items": [{
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      }]
    },
    "PriceClass": "PriceClass_100"
  }' \
  --query 'Distribution.[Id,DomainName]' \
  --output text)

CF_ID=$(echo "$CF_DISTRIBUTION" | awk '{print $1}')
CF_DOMAIN=$(echo "$CF_DISTRIBUTION" | awk '{print $2}')
echo "  ✅  CloudFront created: https://${CF_DOMAIN}"
echo "  📝  Distribution ID: ${CF_ID}  (needed for deploy-frontend.sh)"

# ── Step 4: RDS PostgreSQL ────────────────────────────────────
echo "🗄️   [4/5] Creating RDS PostgreSQL instance (this takes ~5 minutes)..."
aws rds create-db-instance \
  --db-instance-identifier "${DB_INSTANCE_ID}" \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version "16.3" \
  --master-username "${DB_USER}" \
  --master-user-password "${DB_PASSWORD}" \
  --db-name "${DB_NAME}" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --no-publicly-accessible \
  --backup-retention-period 7 \
  --region "${AWS_REGION}" \
  --no-deletion-protection \
  2>/dev/null || echo "  (RDS instance may already exist)"

echo "  ⏳  RDS is provisioning – run this to get the endpoint when ready:"
echo "      aws rds describe-db-instances --db-instance-identifier ${DB_INSTANCE_ID} \\"
echo "          --query 'DBInstances[0].Endpoint.Address' --output text --region ${AWS_REGION}"

# ── Step 5: Elastic Beanstalk ─────────────────────────────────
echo "🌱  [5/5] Initialising Elastic Beanstalk..."
cd "$(dirname "$0")"

# Init EB (Python 3.12, us-east-1)
eb init "${EB_APP_NAME}" \
  --platform "Python 3.12" \
  --region "${AWS_REGION}" \
  --no-interactive 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   NEXT STEPS – Complete manually                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Wait for RDS to finish (~5 min), then get its endpoint:"
echo "   aws rds describe-db-instances --db-instance-identifier ${DB_INSTANCE_ID} \\"
echo "       --query 'DBInstances[0].Endpoint.Address' --output text --region ${AWS_REGION}"
echo ""
echo "2. Create the EB environment:"
echo "   eb create ${EB_ENV_NAME} \\"
echo "     --instance-type t3.micro \\"
echo "     --region ${AWS_REGION}"
echo ""
echo "3. Set environment variables on EB:"
echo "   eb setenv \\"
echo "     FLASK_ENV=production \\"
echo "     SECRET_KEY='${SECRET_KEY}' \\"
echo "     DATABASE_URL='postgresql://${DB_USER}:${DB_PASSWORD}@<RDS_ENDPOINT>:5432/${DB_NAME}' \\"
echo "     CORS_ORIGINS='https://${CF_DOMAIN}'"
echo ""
echo "4. Deploy the backend:"
echo "   eb deploy"
echo ""
echo "5. Update deploy-frontend.sh:"
echo "   export S3_BUCKET='${S3_BUCKET}'"
echo "   export CLOUDFRONT_ID='${CF_ID}'"
echo "   ./deploy-frontend.sh"
echo ""
echo "✅  Infrastructure bootstrap complete!"
echo "    CloudFront URL:  https://${CF_DOMAIN}"
