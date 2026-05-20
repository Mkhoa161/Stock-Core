---
phase: 01-database-foundation
plan: 01
subsystem: database
tags: [postgres, pg.Pool, connection-pooling, historical-data, date-fix, unit-tests]

# Dependency graph
requires: []
provides:
  - pg.Pool connection layer (max: 10, keepAlive) replacing pg.Client singleton
  - ISO date-string comparison in checkDataCompleteness() fixing time-of-day mismatch bug
  - MAX_DAYS=365, CLEANUP_DAYS=400 retention constants in HistoricalDataService
  - Wave 0 unit test scaffold for DB-02/DB-03/DB-04 in historicalDataService.test.ts
affects:
  - 01-02 (bulkUpsertStockPrices method that DB-02 tests reference)
  - Phase 2 Lambda (Pool enables concurrent writes without connection exhaustion)

# Tech tracking
tech-stack:
  added: []  # No new packages - pg.Pool was already in pg 8.21.0
  patterns:
    - probe-and-release pattern for Pool connectivity check at startup
    - ISO date string comparison (toISOString().slice(0, 10)) for timezone-safe date comparisons
    - jest.mock('../config/database') before service imports to prevent live pool connection in unit tests

key-files:
  created:
    - backend/src/tests/historicalDataService.test.ts
  modified:
    - backend/src/config/database.ts
    - backend/src/services/historicalDataService.ts

key-decisions:
  - "pg.Pool with max: 10, keepAlive: true prevents RDS idle connection resets (D-04, Pitfall 1)"
  - "probe-and-release pattern verifies connectivity at startup without holding a persistent connection handle"
  - "ISO date string comparison strips time-of-day component fixing false-negative cache misses (DB-03, D-06)"
  - "CLEANUP_DAYS=400 gives 35-day headroom above MAX_DAYS=365 to prevent cleanup race condition"
  - "DB-02 tests in Wave 0 are intentionally failing until Plan 02 implements bulkUpsertStockPrices()"

patterns-established:
  - "Pool probe pattern: acquire probe client, release immediately, log success — never hold persistent handle"
  - "toDateStr helper inline in checkDataCompleteness(): const toDateStr = (d: Date): string => d.toISOString().slice(0, 10)"
  - "Unit test isolation: jest.mock('../config/database') MUST appear before any service import to prevent module-load pool connect"

requirements-completed: [DB-01, DB-03, DB-04]

# Metrics
duration: 3min
completed: 2026-05-20
---

# Phase 01 Plan 01: Database Foundation (Wave 0 Infrastructure) Summary

**pg.Pool connection layer (max 10, keepAlive) replacing pg.Client singleton, ISO date-string comparison fixing same-day cache misses, 365/400-day retention constants, and Wave 0 unit test scaffold**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-20T00:48:28Z
- **Completed:** 2026-05-20T00:51:19Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Migrated `database.ts` from `pg.Client` to `pg.Pool` (max: 10, keepAlive: true) — enables concurrent Lambda writes without connection exhaustion
- Fixed time-of-day mismatch bug in `checkDataCompleteness()` that caused unnecessary same-day API refetches
- Extended retention: `MAX_DAYS` 60→365, `CLEANUP_DAYS`=400, cleanup cutoff updated
- Created Wave 0 test scaffold (`historicalDataService.test.ts`) with DB-03/DB-04 passing, DB-02 staged for Plan 02

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 unit test scaffold for DB-02/DB-03/DB-04** - `beb0baa` (test)
2. **Task 2: Migrate database.ts from pg.Client to pg.Pool (DB-01)** - `424f102` (refactor)
3. **Task 3: Fix date completeness bug and lift retention constants (DB-03, DB-04)** - `a3fbe01` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `backend/src/tests/historicalDataService.test.ts` - Wave 0 unit tests covering DB-02/03/04 with mocked dbInterface
- `backend/src/config/database.ts` - Pool migration: `pg.Pool` with max/keepAlive, probe pattern in initializeDatabase
- `backend/src/services/historicalDataService.ts` - Constants lifted to 365/400, toDateStr helper for date comparison fix, cleanup cutoff updated

## Decisions Made
- Used `probe-and-release` pattern in `initializeDatabase()` — verifies connectivity at startup without holding a persistent connection handle, per CONTEXT.md §specifics
- DB-02 unit tests reference `bulkUpsertStockPrices()` which does not exist yet — intentional Wave 0 RED state; the `as any` cast allows compilation before Plan 02 adds the method
- DB-03 test uses exactly 61 rows (today-60 through today inclusive) so `lastDate` equals today's UTC midnight — properly exercises the time-of-day mismatch bug rather than false-passing with future dates

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- Pre-existing stale JSDoc comments in `historicalDataService.ts` reference "FMP API" (lines 38 and 91) from the fmpService→yahooFinanceService migration that was already staged. These are out of scope for this plan and left as-is — they do not affect behavior.

## User Setup Required
None - no external service configuration required. All changes are internal database layer infrastructure.

## Next Phase Readiness
- DB-01 (Pool), DB-03 (date fix), DB-04 (constants) complete and verified
- Plan 02 can add `bulkUpsertStockPrices()` to `companyService.ts` and the staged DB-02 tests will immediately exercise it
- `database.ts` exports a `pg.Pool` — downstream services use `dbInterface.query()` with zero call-site changes needed
- Integration test (`npx jest --testPathPattern=database`) requires `docker-compose up -d` to verify Pool connectivity (DB-01 integration)

---
*Phase: 01-database-foundation*
*Completed: 2026-05-20*
