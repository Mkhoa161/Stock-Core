# Deployment Runbook

This document covers everything needed to configure GitHub secrets, run the first deploy, trigger subsequent releases, and recover from failures.

---

## 1. GitHub Actions Secrets

Configure these 7 secrets in your GitHub repository under **Settings > Secrets and variables > Actions > Repository secrets**.

| Secret Name | Description | How to Retrieve |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | CI/CD IAM user access key ID | `terraform output cicd_access_key_id` |
| `AWS_SECRET_ACCESS_KEY` | CI/CD IAM user secret access key | `terraform output -raw cicd_secret_access_key` (sensitive — `-raw` flag required) |
| `EC2_HOST` | EC2 Elastic IP address (SSH target for container restarts) | `terraform output ec2_elastic_ip` |
| `EC2_SSH_PRIVATE_KEY` | Private key of the SSH key pair attached to the EC2 instance | Download from local key file (`.pem`) created when the key pair was provisioned in AWS EC2 console |
| `ECR_REGISTRY` | Full ECR repository URL including the image name (e.g., `123456789.dkr.ecr.us-east-1.amazonaws.com/stock-core-backend`) | `terraform output ecr_repository_url` — use this value directly as-is; do not append `/stock-core-backend` again |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID for the frontend (e.g., `EXXXXXXXXXXXXX`) | AWS CloudFront console > Distributions, or `aws cloudfront list-distributions --query "DistributionList.Items[].{ID:Id,Domain:DomainName}"` |
| `S3_BUCKET_NAME` | Name of the S3 bucket hosting the static frontend (e.g., `stock-core-frontend-prod`) | AWS S3 console or Terraform state: `terraform state show aws_s3_bucket.frontend` |

> **Note on `ECR_REGISTRY`:** The Terraform output `ecr_repository_url` is the *full* repository URL including the `/stock-core-backend` path component. Use the value directly — image references are formatted as `$ECR_REGISTRY:<tag>`, not `$ECR_REGISTRY/stock-core-backend:<tag>`.

> **Note on `cicd_secret_access_key`:** This Terraform output is marked `sensitive = true`. The plain `terraform output cicd_secret_access_key` will print a redacted value. Always use `terraform output -raw cicd_secret_access_key` to retrieve the actual value.

---

## 2. First-Time EC2 Setup Checklist

These steps must be completed once before the first automated deploy. CI assumes these files exist on EC2.

1. **SSH to EC2** using the key pair and Elastic IP:
   ```bash
   ssh -i /path/to/your-key.pem ec2-user@<EC2_HOST>
   ```

2. **Verify Docker Compose is installed:**
   ```bash
   docker compose version
   ```
   If not present, install the Docker Compose plugin:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker-compose-plugin
   ```

3. **Authenticate Docker to ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
   ```
   Replace `$ECR_REGISTRY` with the full ECR repository URL from `terraform output ecr_repository_url`. You must have AWS CLI configured on the EC2 instance (instance profile or `aws configure`).

4. **Create `~/docker-compose.prod.yml` on EC2** by copying `backend/docker-compose.prod.yml` from the repository:
   ```bash
   # From your local machine:
   scp -i /path/to/your-key.pem backend/docker-compose.prod.yml ec2-user@<EC2_HOST>:~/docker-compose.prod.yml
   ```

5. **Create `~/.env.production` on EC2** by copying `backend/env.production.template` and filling in actual values:
   ```bash
   # From your local machine:
   scp -i /path/to/your-key.pem backend/env.production.template ec2-user@<EC2_HOST>:~/.env.production
   # Then SSH in and edit the file:
   ssh -i /path/to/your-key.pem ec2-user@<EC2_HOST>
   nano ~/.env.production
   ```

   Fill in the following values:
   - `DB_HOST` — RDS endpoint: `terraform output rds_endpoint`
   - `DB_PASSWORD` — the password used when the RDS instance was created
   - `FRONTEND_URL` — CloudFront URL (e.g., `https://dxxxxxxxxxxxxx.cloudfront.net`)
   - `BASE_URL` — EC2 Elastic IP URL (e.g., `http://<EC2_HOST>:3000`)

   Leave `IMAGE_URI` blank or as a placeholder — CI overrides it on every deploy.

---

## 3. Triggering a Deploy

Both workflows (`deploy-backend.yml` and `deploy-frontend.yml`) trigger independently on the same `v*.*` git tag. They run in parallel — a backend failure does not block the frontend deploy.

```bash
# Create an annotated tag
git tag -a v1.1 -m "Release v1.1"

# Push the tag to trigger both workflows
git push origin v1.1
```

Monitor both workflows in the **GitHub Actions** tab of your repository. Each workflow reports its own status independently.

---

## 4. Manual Recovery Procedure

There is no automated rollback. If the EC2 container fails to restart after a deploy, recover manually:

1. **SSH to EC2:**
   ```bash
   ssh -i /path/to/your-key.pem ec2-user@<EC2_HOST>
   ```

2. **Identify the last working image tag from ECR:**
   ```bash
   aws ecr list-images --repository-name stock-core-backend --region us-east-1 \
     --query "imageIds[?imageTag!='latest'].imageTag" --output table
   ```

3. **Re-run the previous working image:**
   ```bash
   IMAGE_URI=$ECR_REGISTRY:<previous-tag> docker compose -f ~/docker-compose.prod.yml up -d
   ```
   Replace `$ECR_REGISTRY` with the full ECR repository URL and `<previous-tag>` with the last known working tag (e.g., `v1.0`).

4. **Verify the backend is responding:**
   ```bash
   curl http://localhost:3000/api/health
   ```

---

## 5. Architecture Overview

The backend runs as a Docker container on an EC2 t3.micro instance, pulling versioned images from ECR on each deploy; the CI/CD workflow SSHes into EC2 and runs `docker compose up -d` with the new image URI. The frontend is a statically exported Next.js site deployed to an S3 bucket behind CloudFront; every tag push builds the site with `next build`, syncs `frontend/out/` to S3 with `--delete` to remove stale files, and creates a CloudFront invalidation so users immediately see the new bundle. A Lambda function runs on a 24-hour EventBridge schedule to collect daily market data for all S&P 500 tickers from Yahoo Finance and store it in RDS PostgreSQL. The backend, Lambda, and RDS instances all operate within the same AWS region (us-east-1).
