# Stock Core

A public, read-only S&P 500 market tracker. Displays live prices and historical candlestick charts for all 500 companies. No login required.

Live: **https://d3jobdo4aj97zu.cloudfront.net**

---

## What it does

- Browse all 503 S&P 500 companies with live price, day change, market cap, and volume
- Click any company to see a 30-day candlestick chart with OHLCV history
- Search and paginate the company list
- Data is collected nightly at 2 AM UTC by an AWS Lambda function

---

## Architecture

```
Browser
  └── CloudFront (HTTPS)
        ├── /api/*  ──────► EC2 (Express API, port 3000, Docker)
        │                       └── RDS PostgreSQL
        └── /*  ─────────► S3 (Next.js static export)

AWS Lambda (nightly cron)
  └── Yahoo Finance API ──► RDS PostgreSQL
```

**Frontend** — Next.js 15 static export deployed to S3 + CloudFront. No server-side rendering; every page is a pre-built HTML file. Client components fetch data from the API via React Query.

**Backend** — Express 5 REST API running in a Docker container on EC2. Raw SQL via `pg` (no ORM). Serves company data and historical prices from PostgreSQL. Also exposes on-demand historical fetching with a DB-first cache.

**Data pipeline** — AWS Lambda (Node.js 20) runs nightly on EventBridge. Scrapes the S&P 500 list from Wikipedia, collects bulk quotes and historical OHLCV data from Yahoo Finance, writes everything to RDS.

**Infrastructure** — Terraform-managed. Two modules: `terraform/backend` (EC2, RDS, Lambda, ECR, VPC, security groups) and `terraform/frontend` (S3, CloudFront with dual origins).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 15.4 + React 19 |
| Styling | Tailwind CSS 4 |
| Data fetching | TanStack React Query 5 |
| Charts | ECharts 5 (candlestick) |
| Backend framework | Express 5 + TypeScript |
| Database | PostgreSQL 14 (AWS RDS) |
| Database client | `pg` 8 — raw SQL, no ORM |
| Market data | `yahoo-finance2` 2.13 |
| Lambda runtime | Node.js 20 |
| Container | Docker (`node:20-alpine`) |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| CDN | AWS CloudFront |
| Object storage | AWS S3 |

---

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/companies` | Paginated company list with latest prices. Params: `page`, `limit` (max 100), `search` |
| `GET` | `/api/companies/:ticker` | Single company with latest price data |
| `GET` | `/api/companies/:ticker/historical` | Historical OHLCV. Params: `days` (default 30, max 365) or `from`+`to` (YYYY-MM-DD) |

All API traffic routes through CloudFront (`/api/*` behavior → EC2 origin, CachingDisabled).

---

## Local Development

### Prerequisites

- Node.js 20+
- Docker + Docker Compose (for PostgreSQL)

### Backend

```bash
cd backend
npm install

# Start local PostgreSQL on port 5433
docker-compose up -d

# Copy env template and fill in values
cp env.production.template .env
# Set DB_HOST=localhost, DB_PORT=5433, DB_USERNAME=postgres, DB_PASSWORD=postgres, DB_NAME=stock_insight

npm run dev        # ts-node dev server on port 3000
```

### Frontend

```bash
cd frontend
npm install

# Point at local backend
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:3000" > .env.local

npm run dev        # Next.js dev server on port 3001
```

### Seed the database

```bash
cd backend
npm run scrape:sp500   # scrapes Wikipedia, inserts S&P 500 companies
npm run test:lambda    # runs the full data collection pipeline locally
```

---

## CI/CD

Two GitHub Actions workflows trigger on any `v*.*` tag pushed to `main`:

| Workflow | File | Steps |
|---|---|---|
| Deploy Backend | `deploy-backend.yml` | Jest tests (with Postgres service) → build + push Docker image to ECR → SSH to EC2, pull image, restart container |
| Deploy Frontend | `deploy-frontend.yml` | `next build` (static export) → `aws s3 sync` to S3 → CloudFront invalidation |

**To release:**
```bash
git tag v1.4
git push origin v1.4
```

**Required GitHub Secrets** (see `docs/deployment.md` for retrieval instructions):

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | CI/CD IAM user key ID |
| `AWS_SECRET_ACCESS_KEY` | CI/CD IAM user secret key |
| `EC2_HOST` | EC2 Elastic IP |
| `EC2_SSH_PRIVATE_KEY` | EC2 SSH private key (.pem contents) |
| `ECR_REGISTRY` | Full ECR repository URL |
| `S3_BUCKET_NAME` | Frontend S3 bucket name |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| `NEXT_PUBLIC_API_BASE_URL` | CloudFront HTTPS URL (e.g. `https://xxxx.cloudfront.net`) |

---

## Infrastructure (Terraform)

```
terraform/
├── backend/    # EC2, RDS, Lambda, ECR, VPC, subnets, security groups, EventBridge
└── frontend/   # S3 bucket, CloudFront distribution (dual origin: S3 + EC2)
```

```bash
cd terraform/backend   # or frontend
terraform init
terraform plan
terraform apply
```

---

## Lambda Data Pipeline

The `stock-core-daily-collector` Lambda runs at `cron(0 2 * * ? *)` (2 AM UTC).

**Pipeline steps:**
1. Scrape S&P 500 tickers from Wikipedia — insert new companies, skip existing
2. Fetch live market data for all 503 tickers via batched `quote()` calls — writes to `daily_summaries`
3. Fetch 365 days of OHLCV history for stale tickers (missing or >7 days old) — writes to `stock_prices`
4. Update company profiles (sector, industry) for up to 50 stale companies per run
5. Delete `stock_prices` rows older than 400 days

**To build and deploy the Lambda bundle manually:**
```bash
cd backend
npm run build:lambda            # esbuild → dist/lambda.zip
aws lambda update-function-code \
  --function-name stock-core-daily-collector \
  --zip-file fileb://dist/lambda.zip \
  --region us-east-1
```

**To invoke manually:**
```bash
aws lambda invoke \
  --function-name stock-core-daily-collector \
  --invocation-type Event \
  --region us-east-1 \
  --payload '{"source":"manual"}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/out.json
```

---

## Project Structure

```
Stock-Core/
├── frontend/
│   └── src/
│       ├── app/               # Next.js App Router pages
│       ├── components/        # CompaniesTable, CompanyDetail, Navigation
│       ├── lib/               # api.ts (fetch wrapper), hooks.ts (React Query), utils.ts
│       ├── providers/         # QueryProvider (React Query client)
│       └── types/             # TypeScript interfaces
├── backend/
│   └── src/
│       ├── lambda/            # dailyDataCollector.ts — Lambda handler + pipeline
│       ├── routes/            # companyRoutes.ts
│       ├── services/          # companyService, historicalDataService, yahooFinanceService
│       ├── scripts/           # scrapeSP500.ts, testLambda.ts
│       ├── config/            # database.ts (pg client), config.ts
│       └── models/            # TypeScript interfaces (company.ts, user.ts)
├── terraform/
│   ├── backend/               # EC2, RDS, Lambda, ECR, VPC, IAM
│   └── frontend/              # S3, CloudFront
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml
│       └── deploy-frontend.yml
└── docs/
    └── deployment.md          # Secrets guide, EC2 setup, recovery runbook
```

---

## Environment Variables

### Backend (`.env` / `.env.production`)

```env
NODE_ENV=production
PORT=3000
DB_HOST=<RDS endpoint>
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<password>
DB_NAME=stock_insight
FRONTEND_URL=https://<cloudfront-domain>
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

In production this is baked in at build time via the `NEXT_PUBLIC_API_BASE_URL` GitHub secret.
