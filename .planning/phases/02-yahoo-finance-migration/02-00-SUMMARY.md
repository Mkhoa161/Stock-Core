---
phase: 02-yahoo-finance-migration
plan: 00
subsystem: testing
tags: [yahoo-finance2, jest, typescript, mocking]

# Dependency graph
requires:
  - phase: 01-database-foundation
    provides: pg.Pool migration and bulkUpsertStockPrices — used by Wave 1 service rewrites
provides:
  - 02-WAVE0-FINDINGS.md with empirical verdicts for changePercent unit and HTTPError import path
  - yahooFinanceService.test.ts scaffold with mock preamble for Wave 1 implementation
  - dailyDataCollector.test.ts scaffold with mock preamble for Wave 3 implementation
affects: [02-01, 02-02, 02-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - jest.mock preamble must appear before all imports (prevents pg.Pool connect at module load)
    - HTTPError accessed via yahooFinance.errors.HTTPError (subpath not in package exports)
    - test.todo() used for Wave N+1 behaviors to satisfy <automated> verify targets now

key-files:
  created:
    - .planning/phases/02-yahoo-finance-migration/02-WAVE0-FINDINGS.md
    - backend/src/tests/yahooFinanceService.test.ts
    - backend/src/tests/dailyDataCollector.test.ts
  modified: []

key-decisions:
  - "regularMarketChangePercent from yahoo-finance2 quote() is already in PERCENT units — do NOT multiply by 100 (UNVERIFIED-OFFLINE, re-verify when live API available)"
  - "HTTPError must be accessed via yahooFinance.errors.HTTPError from main default import — direct subpath import fails with nodenext moduleResolution"
  - "getCombinedCompanyData x100 multiplier is INCORRECT (Wave 1 must remove it); getBulkQuotes direct passthrough is CORRECT"
  - "test.todo() stubs satisfy Wave 0 <automated> verify targets while leaving real assertions for Wave 1/3"

patterns-established:
  - "Pattern 1: Jest mock preamble order — jest.mock() before all import statements to prevent module-load side effects"
  - "Pattern 2: HTTPError instanceof — use yahooFinance.errors.HTTPError from the default import, not subpath require"

requirements-completed: [YF-01, YF-02, YF-03, YF-06, YF-07]

# Metrics
duration: 15min
completed: 2026-05-19
---

# Phase 02 Plan 00: Wave 0 Empirical Findings and Test Scaffolds Summary

**Documented changePercent unit (PERCENT, not decimal) and HTTPError import path, then created jest mock scaffolds for yahooFinanceService and dailyDataCollector that compile and run green as todo stubs**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-19T00:00:00Z
- **Completed:** 2026-05-19T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Resolved the two blocking empirical unknowns before any feature code is written
- Documented that `regularMarketChangePercent` is already in PERCENT units — `getCombinedCompanyData` ×100 multiplier is wrong and must be removed in Wave 1
- Discovered that `HTTPError` is only accessible via `yahooFinance.errors.HTTPError` (package exports do not expose the `dist/cjs/src/lib/errors` subpath with nodenext resolution)
- Created `yahooFinanceService.test.ts` with correct mock preamble and 6 `test.todo` stubs covering getBulkQuotes, getBulkHistoricalData, withRetry, setGlobalConfig describe blocks
- Created `dailyDataCollector.test.ts` with correct mock preamble (database + yahoo-finance2 + companyService) and 2 `test.todo` stubs for Wave 3 methods

## Empirical Verdicts (verbatim for Wave 1)

### changePercent unit verdict

**PERCENT (UNVERIFIED-OFFLINE)**

Source: `quote.js` comment shows sample `regularMarketChangePercent: -0.53606904` alongside `regularMarketChange: -2.9299927` and `regularMarketPrice: 543.64`. The value -0.536 represents -0.536% (percent form) — not 0.00536 (decimal form).

**Consequence:** `getBulkQuotes` (no multiplier) is CORRECT. `getCombinedCompanyData` (×100) is WRONG and will produce values like -53.6% from a -0.54% move. Remove ×100 in Wave 1.

### HTTPError import path verdict

**`yahooFinance.errors.HTTPError`** (via main default import)

The package `exports` field only exposes the main entry point — the subpath `yahoo-finance2/dist/cjs/src/lib/errors` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` on Node 25 and would fail TypeScript compilation with `moduleResolution: nodenext`.

```typescript
import yahooFinance from 'yahoo-finance2';

// Inside withRetry:
const HTTPError = yahooFinance.errors['HTTPError'];
if (error instanceof HTTPError) {
  const code = (error as any).code; // numeric: 429, 404, etc.
  // ...
}
```

Verified: `yahooFinance.errors.HTTPError` is the same constructor instance that `yahooFinanceFetch.js` uses internally — `instanceof` checks work correctly across the module boundary.

## Task Commits

Each task was committed atomically:

1. **Task 1: Run two empirical verifications and document findings** - `cb632fd` (docs)
2. **Task 2: Create yahooFinanceService.test.ts and dailyDataCollector.test.ts scaffolds** - `ae29562` (test)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `.planning/phases/02-yahoo-finance-migration/02-WAVE0-FINDINGS.md` - Full empirical findings with both verdicts, raw evidence, and import path discovery
- `backend/src/tests/yahooFinanceService.test.ts` - Jest scaffold with mock preamble + 6 test.todo stubs (Wave 1 target)
- `backend/src/tests/dailyDataCollector.test.ts` - Jest scaffold with mock preamble + 2 test.todo stubs (Wave 3 target)

## Decisions Made

- Used `test.todo()` for all Wave 1/3 behaviors to keep the scaffold green while leaving real assertion slots for downstream tasks
- Included `errors.HTTPError` mock class in the `yahoo-finance2` mock object so the `instanceof` pattern compiles correctly in Wave 1 tests even before the service uses it
- Fell back to source code inspection for changePercent unit after live API rate-limited; flagged as UNVERIFIED-OFFLINE so Wave 1 can re-run the empirical check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] yahoo-finance2 mock includes errors.HTTPError constructor**
- **Found during:** Task 2 (test scaffold creation)
- **Issue:** The plan mock preamble template only mocked `setGlobalConfig, quote, chart, quoteSummary` — but `withRetry` tests (Wave 1) will need `instanceof HTTPError` to work with the mock. Without including a `HTTPError` class in the mock, those tests would fail to resolve the constructor.
- **Fix:** Added `errors: { HTTPError: class HTTPError extends Error { ... } }` to the `yahoo-finance2` mock factory in both test files, matching the structure discovered during the HTTPError path verification.
- **Files modified:** both test files
- **Verification:** Tests compile and run green
- **Committed in:** ae29562

---

**Total deviations:** 1 auto-fixed (Rule 1 - correctness for downstream Wave 1 test targets)
**Impact on plan:** Minor proactive fix; the mock now correctly reflects the real library structure discovered in Task 1.

## Issues Encountered

- Yahoo Finance API returned rate-limit error during live verification run — fell back to source code inspection for changePercent verdict. Flagged as UNVERIFIED-OFFLINE in findings.
- `yahoo-finance2/dist/cjs/src/lib/errors` subpath NOT in package exports — must use `yahooFinance.errors.HTTPError` pattern instead of the import string mentioned in RESEARCH.md YF-06.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 1 (02-01): Can start immediately. Findings doc unblocks all change-percent and HTTPError code.
- `yahooFinanceService.test.ts` provides the `<automated>` verify target for getBulkQuotes, getBulkHistoricalData, withRetry, setGlobalConfig tasks.
- `dailyDataCollector.test.ts` provides the `<automated>` verify target for Wave 3 staleness methods.
- Re-run live quote() check when rate limit clears to confirm PERCENT verdict (optional — source code evidence is strong).

---
*Phase: 02-yahoo-finance-migration*
*Completed: 2026-05-19*
