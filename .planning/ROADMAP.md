# Roadmap: Stock-Core

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-05-21)
- 🚧 **v1.1 Deploy & Polish** — Phases 5-9 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-05-21</summary>

- [x] Phase 1: Database Foundation (2/2 plans) — completed 2026-05-20
- [x] Phase 2: Yahoo Finance Migration (4/4 plans) — completed 2026-05-20
- [x] Phase 3: Static Export Hardening (3/3 plans) — completed 2026-05-20
- [x] Phase 4: Auth Removal (3/3 plans) — completed 2026-05-21

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.
</details>

### 🚧 v1.1 Deploy & Polish (Phases 5-9)

- [ ] **Phase 5: Backend AWS Infrastructure** — Terraform provisions full backend AWS stack (VPC, ECR, RDS, EC2, Lambda, IAM)
- [ ] **Phase 6: Docker Image Hardening** — Professional 2-stage Dockerfile and clean compose files ready for ECR-based deployment
- [ ] **Phase 7: CI/CD Pipelines** — GitHub Actions workflows automate backend deploy to EC2 and frontend deploy to S3 on version tags
- [ ] **Phase 8: Pagination** — Backend and frontend support paginated company list with URL-synced state and debounced search
- [ ] **Phase 9: Visual Polish** — UI design improvements and chart fixes bring the public dashboard to production quality

---

## Phase Details

### Phase 5: Backend AWS Infrastructure
**Goal**: All backend AWS infrastructure exists in Terraform so the application can be deployed to a real environment
**Depends on**: Nothing (first v1.1 phase; runs independently of Docker/CI/CD work)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07
**Success Criteria** (what must be TRUE):
  1. `terraform apply` in `terraform/backend/` completes without error in a clean AWS account
  2. `aws ecr describe-repositories` lists the `stock-core-backend` repository; `aws ec2 describe-instances` shows a running t3.micro with an Elastic IP
  3. A `curl` against the EC2 Elastic IP on port 3000 reaches the backend after the user-data script starts the container on first boot
  4. The CI/CD IAM user exists with a scoped inline policy (no admin rights); its credentials can be set as GitHub Actions secrets
**Plans**: 5 plans
Plans:
- [ ] 05-01-PLAN.md — Terraform foundation: provider config, VPC (2 public + 2 private subnets), IGW, NAT GW, all security groups
- [ ] 05-02-PLAN.md — ECR repository (stock-core-backend) + RDS PostgreSQL 14 (db.t3.micro, private subnets)
- [ ] 05-03-PLAN.md — EC2 t3.micro with Elastic IP, IAM instance profile, SSH key pair, user-data Docker bootstrap
- [ ] 05-04-PLAN.md — Lambda (esbuild zip, nodejs18.x, 900s timeout) + EventBridge daily schedule
- [ ] 05-05-PLAN.md — CI/CD IAM user (scoped inline policy) + Terraform outputs file + state .gitignore

### Phase 6: Docker Image Hardening
**Goal**: The backend has a production-grade 2-stage Dockerfile and clean compose files so any environment can build and run the image
**Depends on**: Nothing (parallel-eligible with Phase 5; no code dependency)
**Requirements**: DOCK-01, DOCK-02, DOCK-03
**Success Criteria** (what must be TRUE):
  1. `docker build -f backend/Dockerfile .` produces a working image; `docker run` starts the Express server without error
  2. Production image contains only `dist/` and production `node_modules` — no TypeScript source, no devDependencies in the final layer
  3. `backend/docker-compose.yml` starts the local dev stack cleanly with no auth-related env vars present
  4. `backend/docker-compose.prod.yml` references the ECR image via `IMAGE_URI` env var with no hardcoded registry URL
**Plans**: 5 plans
Plans:
- [ ] 05-01-PLAN.md — Terraform foundation: provider config, VPC (2 public + 2 private subnets), IGW, NAT GW, all security groups
- [ ] 05-02-PLAN.md — ECR repository (stock-core-backend) + RDS PostgreSQL 14 (db.t3.micro, private subnets)
- [ ] 05-03-PLAN.md — EC2 t3.micro with Elastic IP, IAM instance profile, SSH key pair, user-data Docker bootstrap
- [ ] 05-04-PLAN.md — Lambda (esbuild zip, nodejs18.x, 900s timeout) + EventBridge daily schedule
- [ ] 05-05-PLAN.md — CI/CD IAM user (scoped inline policy) + Terraform outputs file + state .gitignore

### Phase 7: CI/CD Pipelines
**Goal**: Pushing a version tag to GitHub automatically builds, tests, and deploys both backend and frontend to AWS
**Depends on**: Phase 5 (ECR repository, EC2 instance, and CI/CD IAM user must exist), Phase 6 (Dockerfile must be production-ready)
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04
**Success Criteria** (what must be TRUE):
  1. Pushing a `v*.*` git tag triggers `deploy-backend.yml`; the workflow runs `npm test`, builds and pushes the Docker image to ECR (git tag + `latest`), SSHes to EC2, and restarts the container — all steps green
  2. The same tag push triggers `deploy-frontend.yml`; the workflow builds the static export, syncs `out/` to S3, and invalidates CloudFront — new bundle visible at the CloudFront URL
  3. A failing `npm test` result aborts the backend deploy before any image is pushed to ECR
  4. `docs/deployment.md` documents all 7 required GitHub secrets; a developer following the doc can configure a fresh repo and trigger a successful deploy
**Plans**: 5 plans
Plans:
- [ ] 05-01-PLAN.md — Terraform foundation: provider config, VPC (2 public + 2 private subnets), IGW, NAT GW, all security groups
- [ ] 05-02-PLAN.md — ECR repository (stock-core-backend) + RDS PostgreSQL 14 (db.t3.micro, private subnets)
- [ ] 05-03-PLAN.md — EC2 t3.micro with Elastic IP, IAM instance profile, SSH key pair, user-data Docker bootstrap
- [ ] 05-04-PLAN.md — Lambda (esbuild zip, nodejs18.x, 900s timeout) + EventBridge daily schedule
- [ ] 05-05-PLAN.md — CI/CD IAM user (scoped inline policy) + Terraform outputs file + state .gitignore

### Phase 8: Pagination
**Goal**: Users can browse all 500+ companies without loading everything at once, and can search with instant feedback
**Depends on**: Nothing (pure API + frontend feature; no infrastructure dependency required to develop)
**Requirements**: PAGI-01, PAGI-02, PAGI-03, PAGI-04, PAGI-05
**Success Criteria** (what must be TRUE):
  1. `GET /api/companies?page=2&limit=50` returns the correct company slice with response shape `{ data, total, page, limit, totalPages }`
  2. Clicking Next/Prev navigates between pages; the URL updates to `?page=N`; refreshing at `?page=3` renders page 3 without resetting to page 1
  3. Search input debounces at 300ms, resets pagination to page 1 on new query, shows "Showing N results", and has a × clear button
  4. Prev button is disabled on page 1; Next button is disabled on the last page; "Page N of M" label is always visible
**Plans**: 5 plans
Plans:
- [ ] 05-01-PLAN.md — Terraform foundation: provider config, VPC (2 public + 2 private subnets), IGW, NAT GW, all security groups
- [ ] 05-02-PLAN.md — ECR repository (stock-core-backend) + RDS PostgreSQL 14 (db.t3.micro, private subnets)
- [ ] 05-03-PLAN.md — EC2 t3.micro with Elastic IP, IAM instance profile, SSH key pair, user-data Docker bootstrap
- [ ] 05-04-PLAN.md — Lambda (esbuild zip, nodejs18.x, 900s timeout) + EventBridge daily schedule
- [ ] 05-05-PLAN.md — CI/CD IAM user (scoped inline policy) + Terraform outputs file + state .gitignore
**UI hint**: yes

### Phase 9: Visual Polish
**Goal**: The public dashboard looks professional — readable price data, correct charts, and a coherent visual design
**Depends on**: Nothing (pure frontend; no dependency on infrastructure phases)
**Requirements**: DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, CHART-01, CHART-02, CHART-03, CHART-04
**Success Criteria** (what must be TRUE):
  1. Company list table has a sticky header that stays visible while scrolling; rows show hover highlight and alternating zebra stripe; nav bar highlights the active route
  2. Company detail page displays price in large text; positive day change is green with ▲; negative day change is red with ▼; chart section is visually separated from price info
  3. Historical price chart renders correct OHLCV candlesticks for at least 5 representative tickers (e.g., AAPL, TSLA, SHW) with zero ECharts console errors
  4. Chart container shows a loading skeleton while data is fetching; shows a styled "No historical data available" empty state for tickers with zero price records
**Plans**: 5 plans
Plans:
- [ ] 05-01-PLAN.md — Terraform foundation: provider config, VPC (2 public + 2 private subnets), IGW, NAT GW, all security groups
- [ ] 05-02-PLAN.md — ECR repository (stock-core-backend) + RDS PostgreSQL 14 (db.t3.micro, private subnets)
- [ ] 05-03-PLAN.md — EC2 t3.micro with Elastic IP, IAM instance profile, SSH key pair, user-data Docker bootstrap
- [ ] 05-04-PLAN.md — Lambda (esbuild zip, nodejs18.x, 900s timeout) + EventBridge daily schedule
- [ ] 05-05-PLAN.md — CI/CD IAM user (scoped inline policy) + Terraform outputs file + state .gitignore
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database Foundation | v1.0 | 2/2 | Done | 2026-05-20 |
| 2. Yahoo Finance Migration | v1.0 | 4/4 | Done | 2026-05-20 |
| 3. Static Export Hardening | v1.0 | 3/3 | Done | 2026-05-20 |
| 4. Auth Removal | v1.0 | 3/3 | Done | 2026-05-21 |
| 5. Backend AWS Infrastructure | v1.1 | 0/? | Not started | - |
| 6. Docker Image Hardening | v1.1 | 0/? | Not started | - |
| 7. CI/CD Pipelines | v1.1 | 0/? | Not started | - |
| 8. Pagination | v1.1 | 0/? | Not started | - |
| 9. Visual Polish | v1.1 | 0/? | Not started | - |
