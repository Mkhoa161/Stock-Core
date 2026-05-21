# Stock-Core

## What This Is

A public read-only S&P 500 stock tracker that collects daily market data for all 500+ companies via Yahoo Finance and serves it as a statically-exported Next.js site on S3. Users can browse the company list, view live price data, and inspect historical price charts — no login required. v1.0 ships with a fully wired Yahoo Finance pipeline, hermetic builds for all 503 tickers, Terraform-managed CloudFront distribution, and a clean codebase with auth fully removed.

## Core Value

Every S&P 500 ticker shows accurate market data and a working historical price chart.

## Current Milestone: v1.1 Deploy & Polish

**Goal:** Take the v1.0 codebase to production — full AWS backend infrastructure via Terraform, ECR-backed Docker deployment on EC2 t3.micro, GitHub Actions CI/CD triggered by version tags, and UI improvements (pagination, visual design, chart fixes, search).

**Target features:**
- Backend AWS infrastructure: VPC, ECR, RDS (db.t3.micro), EC2 (t3.micro + Elastic IP), Lambda, IAM roles — all via Terraform in `terraform/backend/`
- Professional 2-stage Dockerfile (builder + production); clean docker-compose.yml; production compose referencing ECR
- GitHub Actions: deploy-backend (test → ECR push → EC2 restart) + deploy-frontend (build → S3 sync → CF invalidation), triggered on version tags
- Paginated company list API + frontend with URL-synced page state and debounced search
- Improved visual design: sticky header, colored price changes, consistent Tailwind design tokens
- Chart audit and fixes: correct ECharts candlestick rendering, loading skeleton, empty state

## Requirements

### Validated

- ✓ S&P 500 company list scraped from Wikipedia — existing
- ✓ PostgreSQL schema: companies, stock_prices, daily_summaries tables — existing
- ✓ Express API serving company list and historical data — existing
- ✓ Next.js frontend with company table and ECharts price charts — existing
- ✓ AWS Lambda daily data collector skeleton — existing
- ✓ Docker setup for local dev — existing
- ✓ Static export to S3 (Next.js `output: 'export'`) — existing
- ✓ PostgreSQL connection pool — `pg.Pool` (max 10, keepAlive) replaces single `pg.Client` — v1.0
- ✓ Date completeness check fixed — ISO string comparison eliminates same-day API refetches — v1.0
- ✓ Historical data retention: 365 days stored, 400-day cleanup — v1.0
- ✓ UNNEST bulk upsert — one SQL statement per ticker, eliminates N+1 inserts — v1.0
- ✓ Yahoo Finance (yahoo-finance2) fully wired as the sole data source — v1.0
- ✓ All 500+ S&P 500 companies collect historical data — stale-only, within 15-min Lambda timeout — v1.0
- ✓ Static export pre-renders pages for all 503 tickers — committed tickers.json, hermetic builds — v1.0
- ✓ Auth removed entirely — public read-only dashboard, no login needed — v1.0
- ✓ Terraform S3 + CloudFront infrastructure with OAC and custom 404 routing — v1.0

### Active

- [ ] Backend AWS infrastructure (VPC, ECR, RDS, EC2, Lambda, IAM) via Terraform — v1.1
- [ ] Professional 2-stage Docker build; clean docker-compose; ECR-based production deployment — v1.1
- [ ] GitHub Actions CI/CD: tagged releases trigger build → ECR push → EC2 restart + S3 deploy + CF invalidation — v1.1
- ✓ Paginated company list API + frontend with URL-synced page state and debounced search — Validated in Phase 8
- [ ] Improved visual design: sticky header, colored price changes, consistent Tailwind design tokens — v1.1
- [ ] Chart audit and fixes: correct ECharts candlestick rendering, loading skeleton, empty state — v1.1
- [ ] `daily_summaries` stores extended fields: `previous_close`, `day_high`, `day_low`, `fifty_two_week_high`, `fifty_two_week_low`, `trailing_pe`, `eps` — v2
- [ ] Historical chart period selectors: 1M / 3M / 6M / 1Y — v2
- [ ] Database migration system (e.g., `node-pg-migrate`) replaces `CREATE TABLE IF NOT EXISTS` — v2
- [ ] Structured logging replaces `console.log`/`console.error` — v2
- [ ] `helmet` middleware + rate limiting on data endpoints — v2

### Out of Scope

- User authentication / login — removed entirely, public dashboard only
- Real-time WebSocket price feeds — daily batch collection is sufficient
- Mobile native app — web-first
- Paid financial data APIs — Yahoo Finance (yahoo-finance2) is free and sufficient
- Portfolio tracking or watchlists — read-only market data only
- Admin panel or moderation — no users, no need
- 5Y / Max chart history — 1Y is sufficient; more storage/quota not justified
- `market_cap` in `stock_prices` table — `daily_summaries.market_cap` is the correct source; fixing stock_prices.market_cap is low priority
- Offline mode — daily batch model is the architecture

## Context

Shipped v1.0 with ~3,683 LOC TypeScript + Terraform across backend, frontend, and infrastructure.

**Tech stack:** Next.js 15 (static export) + Express 5 + PostgreSQL 14 + AWS Lambda + Terraform (S3 + CloudFront)

**Data pipeline:** Yahoo Finance via `yahoo-finance2` — batched quote() for market data (50 symbols/batch), chart() for historical prices, quoteSummary() for company profiles. Stale-only collection keeps Lambda under 15-minute timeout.

**Known technical debt:**
- Single `pg.Pool` shared across all services — no per-request pooling; will bottleneck under concurrent API load
- 168 `console.*` calls — no structured logging or log levels
- No HTTP security headers (helmet) or rate limiting on data endpoints
- `generateStaticParams` reads from committed `tickers.json` — must re-run `generateTickers.ts` to pick up S&P 500 index changes

**Deferred to v2:** DATA-01/02 (extended daily_summaries fields), DATA-03 (period selectors), INFRA-01 (migration system), INFRA-02 (structured logging), INFRA-03/04 (security hardening)

## Constraints

- **Data source**: Yahoo Finance via `yahoo-finance2` only — no paid APIs
- **Deployment**: Static export to S3 — no server-side rendering, no Node.js server in production frontend
- **Lambda timeout**: 15 minutes hard limit — data collection must complete within this window for all 500 tickers
- **Stack**: Keep existing Next.js + Express + PostgreSQL + AWS Lambda stack — no re-architecture

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remove auth entirely | Auth was never functional; this is a public read-only dashboard | ✓ Good — clean codebase, zero auth dead weight |
| Stay on static S3 export | Simpler deployment than server-rendered; pre-rendering 500 tickers at build time is feasible | ✓ Good — 503 tickers pre-rendered; hermetic builds work |
| Yahoo Finance (yahoo-finance2) as sole data provider | Free, already partially implemented, covers all needed endpoints | ✓ Good — full pipeline wired, deprecations resolved |
| Aggressive caching in Lambda | Only refresh companies with stale data to stay within 15-min timeout | ✓ Good — stale-only collection implemented and working |
| pg.Pool with max:10, keepAlive:true | Prevents RDS idle connection resets; enables concurrent writes | ✓ Good — connection exhaustion eliminated |
| Probe-and-release pattern in initializeDatabase() | Verifies connectivity at startup without holding a persistent handle | ✓ Good — clean startup pattern |
| UNNEST bulk upsert with ON CONFLICT DO UPDATE SET | One SQL statement per ticker; corrected prices overwrite stale rows on re-run | ✓ Good — N+1 eliminated, re-runs idempotent |
| withRetry (fn, retries?) signature — no label arg | Simplified; label was unused | ✓ Good — simpler call sites |
| changePercent in PERCENT units — no x100 multiplier | Empirically verified in Wave 0; getBulkQuotes passthrough is correct | ✓ Good — data accuracy confirmed |
| HTTPError via yahooFinance.errors.HTTPError | Subpath import fails under nodenext moduleResolution | ✓ Good — works under strict module resolution |
| OAC (not deprecated OAI) for S3 origin | AWS current best practice; OAI is deprecated | ✓ Good — future-proof CloudFront setup |
| Terraform .terraform.lock.hcl committed | Reproducible provider selection across environments | ✓ Good — deterministic builds |
| Committed tickers.json for generateStaticParams | Hermetic builds — no live API dependency at build time | ✓ Good — build works offline/in CI |
| dynamicParams = false on [ticker] route | Unknown tickers serve 404 instead of attempting server-side generation | ✓ Good — correct static export behavior |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-21 after v1.1 milestone initialization*
