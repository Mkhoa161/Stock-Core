# Roadmap: Stock-Core

## Overview

Stock-Core is a brownfield fix completing a mid-migration S&P 500 dashboard. The project repairs four compounding problems in strict dependency order: the database connection layer must be stabilized before concurrent writes can work; the Yahoo Finance integration must be fully wired before all 500 tickers can collect data; the static export must be made hermetic before all 500 pages reliably deploy; and auth dead code can be deleted independently to simplify the codebase. All four phases together deliver the core value: every S&P 500 ticker shows accurate market data and a working historical price chart.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Database Foundation** - Stabilize the connection layer and data access patterns as prerequisite for all concurrent writes
- [ ] **Phase 2: Yahoo Finance Migration** - Complete the data pipeline so Lambda collects all 500 tickers reliably within the 15-min timeout
- [ ] **Phase 3: Static Export Hardening** - Make next build hermetically generate all 500 pre-rendered pages every time
- [ ] **Phase 4: Auth Removal** - Delete all auth dead code so the codebase compiles clean as a public read-only dashboard

## Phase Details

### Phase 1: Database Foundation

**Goal**: The database layer handles concurrent writes without connection exhaustion, stores a full year of data, and skips unnecessary API refetches
**Depends on**: Nothing (first phase)
**Requirements**: DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):

  1. Lambda can run concurrent DB writes without hitting connection-exhaustion errors (pg.Pool replaces single pg.Client)
  2. A full 500-ticker historical data upsert completes without N+1 INSERT statements (verified via pg query logging showing one statement per ticker)
  3. A second Lambda run within the same day does not re-fetch data already collected that day (date comparison bug is fixed)
  4. Historical data retention window is 1 year (365 days of price data stored, 400-day cleanup retention)

**Plans**: 2 plans
Plans:

- [x] 01-01-PLAN.md — Pool migration (DB-01), date completeness fix (DB-03), retention constants (DB-04), Wave 0 test scaffold
- [x] 01-02-PLAN.md — UNNEST bulk upsert (DB-02), rewire Lambda and frontend cache write paths

### Phase 2: Yahoo Finance Migration

**Goal**: The Lambda daily collector successfully fetches market data and historical prices for all 500 S&P 500 companies within the 15-minute timeout with no deprecation warnings
**Depends on**: Phase 1
**Requirements**: YF-01, YF-02, YF-03, YF-04, YF-05, YF-06, YF-07, YF-08, YF-09
**Success Criteria** (what must be TRUE):

  1. Lambda completes all 5 collection steps for all 500 tickers in under 6 minutes on a fresh database (under 90 seconds on a warm database)
  2. Backend logs show zero Yahoo Finance deprecation warnings during a full collection run (chart() replaces deprecated historical())
  3. A 429 rate-limit response triggers retry with backoff; a 404 (delisted ticker) skips retry without crashing (withRetry uses instanceof error checks)
  4. Price, volume, and market cap fields return null (not 0) in the API response when Yahoo Finance returns no data — no $0.00 masking of real outages
  5. Second Lambda run on the same day only refetches companies with stale profiles or stale historical data (not all 500)

**Plans**: 4 plans
Plans:
**Wave 1**

- [x] 02-00-PLAN.md — Wave 0: empirical verification (changePercent unit, HTTPError import path) + test scaffolds
- [ ] 02-01-PLAN.md — Service rewrite: chart(), array quote(), instanceof HTTPError, setGlobalConfig, null-preserving types (YF-01/02/03/06/07)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 02-02-PLAN.md — Downstream interface cascade: widen StockPrice/upsert/HistoricalDataResponse to number|null (YF-07)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 02-03-PLAN.md — Lambda rewrite: stale-only profiles + historical, batched market data, remove double-delay (YF-04/05/08/09)

### Phase 3: Static Export Hardening

**Goal**: next build always generates pre-rendered pages for all 500 S&P 500 companies without depending on live API availability at build time
**Depends on**: Phase 2
**Requirements**: SE-01, SE-02, SE-03, SE-04, SE-05
**Success Criteria** (what must be TRUE):

  1. `next build` succeeds and produces at least 490 files under `out/company/*/index.html` (verified by file count assertion)
  2. `next build` completes successfully even when the backend API is unreachable (build reads from committed tickers.json, not live API)
  3. Navigating to an unknown route on the S3-deployed site returns a 404 page (not a blank S3 XML error response)
  4. No ticker page returns a 404 after a clean deploy of the full build output

**Plans**: TBD
**UI hint**: yes

### Phase 4: Auth Removal

**Goal**: All auth-related dead code is deleted from backend and frontend, leaving a clean public read-only dashboard that compiles without errors
**Depends on**: Nothing (can run independently of Phases 2 and 3)
**Requirements**: AU-01, AU-02, AU-03, AU-04, AU-05, AU-06, AU-07, AU-08
**Success Criteria** (what must be TRUE):

  1. `npx tsc --noEmit` exits 0 in both backend and frontend with no type errors
  2. `grep -r "useAuth\|AuthContext\|AuthGuard\|AuthProvider" frontend/src/` returns no matches
  3. `backend/package.json` contains no passport, bcryptjs, jsonwebtoken, or cookie-parser entries (packages or @types)
  4. The Express server starts without runtime errors related to passport initialization or missing strategies

**Plans**: TBD

## Progress

**Execution Order:**
Phases 1 and 4 are independent starting points. Phase 2 depends on Phase 1. Phase 3 depends on Phase 2. Recommended order: 1 → 2 → 3, with Phase 4 at any point.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Foundation | 2/2 | ✓ Complete | 2026-05-20 |
| 2. Yahoo Finance Migration | 1/4 | In Progress|  |
| 3. Static Export Hardening | 0/TBD | Not started | - |
| 4. Auth Removal | 0/TBD | Not started | - |
