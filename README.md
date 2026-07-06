# CalcPro – AWS Deployment Guide

> **Full-stack calculator** — Static frontend on S3+CloudFront, Flask backend on Elastic Beanstalk, PostgreSQL on RDS.

---

## Architecture

```
Browser → CloudFront (HTTPS CDN) → S3 (HTML / CSS / JS)
                                 ↘
                            Elastic Beanstalk (Flask + Gunicorn)
                                 ↘
                              RDS PostgreSQL
```

---

## Prerequisites

Install these tools before starting:

```bash
# 1. AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
aws --version   # should print aws-cli/2.x.x

# 2. EB CLI
pip install awsebcli
eb --version

# 3. Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g. us-east-1), Output format (json)
```

---

## Quick Start – Automated Setup

```bash
# Clone / navigate to project
cd mini_calcutor

# Make scripts executable
chmod +x aws-setup.sh deploy-frontend.sh

# Edit aws-setup.sh — change DB_PASSWORD and AWS_REGION at the top, then:
./aws-setup.sh
```

The script will output the exact commands to run for steps 2–5.

---

## Manual Step-by-Step Deployment

### Step 1 — Create S3 Bucket (Frontend)

```bash
BUCKET="calcpro-frontend-$(date +%s)"

aws s3api create-bucket --bucket "$BUCKET" --region us-east-1

# Public read policy
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

aws s3api put-bucket-policy --bucket "$BUCKET" --policy '{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject",
                "Resource":"arn:aws:s3:::'"$BUCKET"'/*"}]}'

aws s3 website s3://$BUCKET/ --index-document index.html --error-document index.html
```

### Step 2 — Upload Frontend Files

```bash
export S3_BUCKET="$BUCKET"
./deploy-frontend.sh
```

### Step 3 — Create CloudFront Distribution

Use the **AWS Console**: CloudFront → Create distribution → point to your S3 website endpoint.

Or use `aws-setup.sh` (it does this automatically).

### Step 4 — Create RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier calcpro-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username calcpro_user \
  --master-user-password "YourStrongPassword!" \
  --db-name calcpro_db \
  --allocated-storage 20 \
  --no-publicly-accessible \
  --region us-east-1

# Wait ~5 minutes, then get the endpoint:
aws rds describe-db-instances \
  --db-instance-identifier calcpro-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### Step 5 — Deploy Backend to Elastic Beanstalk

```bash
# Initialise EB project (run once)
eb init calcpro-backend --platform "Python 3.12" --region us-east-1

# Create the environment
eb create calcpro-prod --instance-type t3.micro

# Set production environment variables
eb setenv \
  FLASK_ENV=production \
  SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')" \
  DATABASE_URL="postgresql://calcpro_user:YourStrongPassword!@<RDS_ENDPOINT>:5432/calcpro_db" \
  CORS_ORIGINS="https://<YOUR_CLOUDFRONT_DOMAIN>.cloudfront.net"

# Deploy!
eb deploy
```

### Step 6 — Update CORS Origins

After EB deploy, update the `CORS_ORIGINS` env var to include your CloudFront domain:

```bash
eb setenv CORS_ORIGINS="https://xxxx.cloudfront.net"
```

---

## Verify Deployment

```bash
# Check backend health
curl https://your-eb-url.elasticbeanstalk.com/api/health
# Expected: {"ok": true, "data": {"status": "healthy", ...}}

# Check frontend
curl -I https://xxxx.cloudfront.net/index.html
# Expected: HTTP/2 200
```

---

## Re-deploy (Day-to-Day)

```bash
# Frontend change
./deploy-frontend.sh

# Backend change
eb deploy
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `FLASK_ENV` | ✅ | Set to `production` |
| `SECRET_KEY` | ✅ | Random 32-byte hex string |
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/db` |
| `CORS_ORIGINS` | ✅ | Comma-separated list of allowed origins |
| `HOST` | Optional | Default `0.0.0.0` |
| `PORT` | Optional | Default `8000` |

---

## Cost Estimate (Low Traffic)

| Service | Free Tier | After 12 months |
|---------|-----------|-----------------|
| S3 + CloudFront | ~$0 | ~$1–2/mo |
| Elastic Beanstalk (t3.micro) | Free 750hrs/mo | ~$8–12/mo |
| RDS PostgreSQL (db.t3.micro) | Free 750hrs/mo | ~$15/mo |
| **Total** | **~$0** | **~$25–30/mo** |

---

## Local Development

```bash
# With Docker Compose (PostgreSQL + Flask + Nginx)
docker compose up --build

# Open: http://localhost  (Nginx serves frontend + proxies API)
# API:  http://localhost/api/health
```
