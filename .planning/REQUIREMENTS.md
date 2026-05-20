# Requirements: Stock-Core

**Defined:** 2026-05-19
**Core Value:** Every S&P 500 ticker shows accurate market data and a working historical price chart.

---

## v1 Requirements

### Database

- [ ] **DB-01**: Database uses `pg.Pool` (max 10 connections) instead of a single `pg.Client` — prerequisite for concurrent inserts
- [ ] **DB-02**: Historical data upsert uses UNNEST bulk insert (one statement per ticker, not one INSERT per row)
- [ ] **DB-03**: Date completeness check uses ISO date string comparison (`toISOString().slice(0,10)`) to strip time-of-day component — fixes time-of-day mismatch between `new Date()` wall-clock and pg UTC midnight DATE columns
- [ ] **DB-04**: `MAX_DAYS` is 365 and cleanup retention is 400 days (was 60/60)

### Yahoo Finance Migration

- [x] **YF-01**: All yahoo-finance2 calls go through a single shared instance configured with `{ queue: { concurrency: 5 } }`
- [x] **YF-02**: Daily market data (price, change, volume, market cap) for all 500 S&P 500 companies is fetched via batched `quote()` calls (50 symbols/batch, 2s between batches) — eliminates the 500×1.5s sequential loop
- [x] **YF-03**: Historical price data uses `chart()` instead of the deprecated `historical()` — response mapped from `result.quotes[]`
- [x] **YF-04**: Company profile data (sector, industry) is fetched only for companies with missing or stale profiles via `quoteSummary(symbol, {modules:['assetProfile','price']})`
- [x] **YF-05**: Historical data is collected only for companies whose data is stale (> 7 days old) — not all 500 on every run
- [x] **YF-06**: `withRetry` checks error type via `instanceof` — retries on 429, skips retry on 404 (delisted tickers)
- [x] **YF-07**: All price/volume/marketCap fields return `null` (not `0`) when Yahoo Finance returns no data — interfaces updated to `number | null`
- [x] **YF-08**: Lambda daily collector completes all 5 steps within 15 minutes for all 500 S&P 500 companies
- [x] **YF-09**: Inter-batch sleep in `dailyDataCollector` removed (the double-delay bug is fixed)

### Static Export

- [x] **SE-01**: A committed `frontend/src/data/tickers.json` file lists all S&P 500 tickers — build does not depend on live API availability
- [ ] **SE-02**: `generateStaticParams` in `[ticker]/page.tsx` reads from `tickers.json` — generates all 500 company pages at build time
- [ ] **SE-03**: `export const dynamicParams = false` is set on the `[ticker]` route
- [ ] **SE-04**: `next build` produces at least 490 files in `out/company/*/index.html` (verifiable post-build)
- [x] **SE-05**: S3 error document is configured to serve `404.html` for unknown routes

### Auth Removal

- [ ] **AU-01**: All auth-related backend files deleted: `authRoutes.ts`, `authMiddleware.ts`, `passport.ts`, `authService.ts`, `userService.ts`, `authUtils.ts`, `user.ts`
- [ ] **AU-02**: All auth-related frontend files deleted: `AuthGuard.tsx`, `AuthProvider.tsx`, `contexts.ts`, `queries.ts`
- [ ] **AU-03**: Auth packages removed from `backend/package.json`: `passport`, `passport-local`, `passport-jwt`, `passport-google-oauth20`, `bcryptjs`, `jsonwebtoken`, `cookie-parser` (and their `@types/*`)
- [ ] **AU-04**: `backend/src/app.ts` has no passport, cookie-parser, or auth route imports
- [ ] **AU-05**: `backend/src/config/config.ts` has no JWT or OAuth configuration
- [ ] **AU-06**: `database.ts` does not create the `users` table
- [ ] **AU-07**: Frontend has zero references to `useAuth`, `AuthContext`, `AuthGuard`, or `AuthProvider` (verified with grep)
- [ ] **AU-08**: Both `npx tsc --noEmit` (backend and frontend) pass after auth removal

---

## v2 Requirements

### Data Richness

- **DATA-01**: `daily_summaries` stores `previous_close`, `day_high`, `day_low` — currently not collected
- **DATA-02**: `daily_summaries` stores `fifty_two_week_high`, `fifty_two_week_low`, `trailing_pe`, `eps` — available in yahoo-finance2 `quote()` response
- **DATA-03**: Historical chart offers period selectors: 1M / 3M / 6M / 1Y

### Infrastructure

- **INFRA-01**: Database migration system (e.g., `node-pg-migrate`) replaces `CREATE TABLE IF NOT EXISTS` schema management
- **INFRA-02**: Structured logging replaces `console.log`/`console.error` (168 occurrences)
- **INFRA-03**: `helmet` middleware added to Express for HTTP security headers
- **INFRA-04**: Rate limiting middleware on all data endpoints

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / login | Removing entirely — public read-only dashboard |
| Real-time WebSocket price feeds | Daily batch model is sufficient and simpler |
| Mobile native app | Web-first |
| Portfolio tracking / watchlists | Read-only market data only |
| Admin panel | No users, no moderation needed |
| 5Y / Max chart history | Requires more storage and API quota; 1Y is sufficient |
| `market_cap` in `stock_prices` table | Currently always 0; `daily_summaries.market_cap` already correct; fixing is low priority |
| Paid financial data APIs | yahoo-finance2 is free and sufficient |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 1: Database Foundation | Pending |
| DB-02 | Phase 1: Database Foundation | Pending |
| DB-03 | Phase 1: Database Foundation | Pending |
| DB-04 | Phase 1: Database Foundation | Pending |
| YF-01 | Phase 2: Yahoo Finance Migration | Complete |
| YF-02 | Phase 2: Yahoo Finance Migration | Complete |
| YF-03 | Phase 2: Yahoo Finance Migration | Complete |
| YF-04 | Phase 2: Yahoo Finance Migration | Complete |
| YF-05 | Phase 2: Yahoo Finance Migration | Complete |
| YF-06 | Phase 2: Yahoo Finance Migration | Complete |
| YF-07 | Phase 2: Yahoo Finance Migration | Complete |
| YF-08 | Phase 2: Yahoo Finance Migration | Complete |
| YF-09 | Phase 2: Yahoo Finance Migration | Complete |
| SE-01 | Phase 3: Static Export Hardening | Complete |
| SE-02 | Phase 3: Static Export Hardening | Pending |
| SE-03 | Phase 3: Static Export Hardening | Pending |
| SE-04 | Phase 3: Static Export Hardening | Pending |
| SE-05 | Phase 3: Static Export Hardening | Complete |
| AU-01 | Phase 4: Auth Removal | Pending |
| AU-02 | Phase 4: Auth Removal | Pending |
| AU-03 | Phase 4: Auth Removal | Pending |
| AU-04 | Phase 4: Auth Removal | Pending |
| AU-05 | Phase 4: Auth Removal | Pending |
| AU-06 | Phase 4: Auth Removal | Pending |
| AU-07 | Phase 4: Auth Removal | Pending |
| AU-08 | Phase 4: Auth Removal | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-19*
*Last updated: 2026-05-19 after roadmap creation*
