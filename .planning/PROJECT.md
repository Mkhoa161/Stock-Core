# Stock-Core

## What This Is

A public read-only S&P 500 stock tracker that collects daily market data for all 500 companies via Yahoo Finance and serves it as a statically-exported Next.js site on S3. Users can browse the company list, view live price data, and inspect historical price charts — no login required.

## Core Value

Every S&P 500 ticker shows accurate market data and a working historical price chart.

## Requirements

### Validated

- ✓ S&P 500 company list scraped from Wikipedia — existing
- ✓ PostgreSQL schema: companies, stock_prices, daily_summaries tables — existing
- ✓ Express API serving company list and historical data — existing
- ✓ Next.js frontend with company table and ECharts price charts — existing
- ✓ AWS Lambda daily data collector skeleton — existing
- ✓ Docker setup for local dev — existing
- ✓ Static export to S3 (Next.js `output: 'export'`) — existing

### Active

- [ ] Yahoo Finance (yahoo-finance2) fully wired as the sole data source — migration in progress, service exists but integration is broken
- [ ] All 500 S&P 500 companies collect historical data — currently hardcoded to 10 tickers
- [ ] Static export pre-renders pages for all 500 tickers — currently only 5 hardcoded tickers
- [ ] Auth removed entirely — public read-only dashboard, no login needed
- [ ] market_cap populated correctly in stock_prices — currently always 0
- [ ] Date completeness check fixed — Date object comparison bug causes unnecessary API refetches
- [ ] PostgreSQL connection pool — currently uses a single pg.Client, fails under load
- [ ] Basic security hardening — helmet headers, rate limiting on data endpoints

### Out of Scope

- User authentication / login — removing entirely, public dashboard only
- Real-time WebSocket price feeds — daily batch collection is sufficient
- Mobile native app — web-first
- Paid financial data APIs — Yahoo Finance (yahoo-finance2) is free and sufficient
- Portfolio tracking or watchlists — read-only market data only
- Admin panel or moderation — no users, no need

## Context

- Project was paused mid-migration from Financial Modeling Prep (FMP) to Yahoo Finance. `fmpService.ts` is deleted; `yahooFinanceService.ts` exists but is untracked and may not be fully wired into `historicalDataService.ts` and `dailyDataCollector.ts`.
- The `yahoo-finance2` npm package (v2.13.3) wraps Yahoo Finance's unofficial API. It is already installed. The main risk is API shape changes and rate limits.
- Lambda has a 15-minute hard timeout. Sequential 1.5s delays for 500 tickers = ~12.5 minutes for market data alone. Historical data collection for all 500 would exceed the limit — aggressive caching and selective refresh are needed.
- Auth was never working end-to-end: `AuthProvider` was not mounted in layout, and `useAccountQuery` called `/accounts/me` which never existed. Removing auth is the right call — it simplifies a large swath of broken code.
- Static export requires `generateStaticParams` to enumerate all ticker slugs at build time. Currently only 5 are hardcoded. Fix: fetch all tickers from the database/API at build time.
- `CONCERNS.md` in `.planning/codebase/` has a full catalogue of technical debt — prioritize items that block the core value before addressing lower-priority issues.

## Constraints

- **Data source**: Yahoo Finance via `yahoo-finance2` only — no paid APIs
- **Deployment**: Static export to S3 — no server-side rendering, no Node.js server in production frontend
- **Lambda timeout**: 15 minutes hard limit — data collection must complete within this window for all 500 tickers
- **Stack**: Keep existing Next.js + Express + PostgreSQL + AWS Lambda stack — no re-architecture

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remove auth entirely | Auth was never functional; this is a public read-only dashboard | — Pending |
| Stay on static S3 export | Simpler deployment than server-rendered; pre-rendering 500 tickers at build time is feasible | — Pending |
| Yahoo Finance (yahoo-finance2) as sole data provider | Free, already partially implemented, covers all needed endpoints | — Pending |
| Aggressive caching in Lambda | Only refresh companies with stale data to stay within 15-min timeout | — Pending |

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
*Last updated: 2026-05-19 after initialization*
