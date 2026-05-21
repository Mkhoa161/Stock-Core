---
phase: 04-auth-removal
plan: 02
subsystem: ui
tags: [react, typescript, nextjs, auth-removal, dead-code]

# Dependency graph
requires:
  - phase: 04-auth-removal
    provides: "04-01 removed backend auth routes; this plan cleans frontend auth dead code"
provides:
  - "frontend/src/lib/hooks.ts exports only data hooks: useCompanies, useCompany, useHistoricalData"
  - "frontend/src/providers/QueryProvider.tsx is a minimal QueryClientProvider wrapper with no AuthProvider"
  - "Four auth-only files deleted: AuthGuard.tsx, AuthProvider.tsx, contexts.ts, queries.ts"
affects: [04-03-backend-auth-removal, future-frontend-plans]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Thin QueryClientProvider wrapper — no auth nesting in provider tree"]

key-files:
  created: []
  modified:
    - frontend/src/lib/hooks.ts
    - frontend/src/providers/QueryProvider.tsx

key-decisions:
  - "Deleted contexts.ts, AuthProvider.tsx, AuthGuard.tsx, queries.ts wholesale — all four contained only auth symbols with no reusable logic"
  - "QueryProvider.tsx simplified to wrap children directly in QueryClientProvider with no intermediate AuthProvider"

patterns-established:
  - "hooks.ts: data hooks only (useCompanies, useCompany, useHistoricalData) — no auth hooks"

requirements-completed: [AU-02, AU-07, AU-08]

# Metrics
duration: 8min
completed: 2026-05-20
---

# Phase 04 Plan 02: Auth Removal — Frontend Dead Code Summary

**Deleted four auth-only frontend files and stripped useAuth/AuthContext from hooks.ts and QueryProvider.tsx; frontend compiles clean under tsc --noEmit with zero auth symbol references.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-20T00:00:00Z
- **Completed:** 2026-05-20T00:08:00Z
- **Tasks:** 2
- **Files modified:** 6 (2 modified, 4 deleted)

## Accomplishments

- Stripped `useAuth`, `AuthContext`, and `useContext` from `frontend/src/lib/hooks.ts` — only data hooks remain
- Removed `AuthProvider` import and wrapper tags from `QueryProvider.tsx` — children now wrap directly in `QueryClientProvider`
- Deleted four auth-only files: `AuthGuard.tsx`, `AuthProvider.tsx`, `contexts.ts`, `queries.ts`
- `tsc --noEmit` exits 0 with no errors; `grep` finds zero auth symbol references in `frontend/src/`

## Task Commits

Each task was committed atomically:

1. **Task 1: Strip useAuth from hooks.ts and rebuild QueryProvider.tsx** - `9b0d212` (feat)
2. **Task 2: Delete 4 frontend auth files and verify frontend compiles** - `d4775c4` (feat)

**Plan metadata:** `(final docs commit hash below)`

## Files Created/Modified

- `frontend/src/lib/hooks.ts` - Removed lines 1-2 (AuthContext/useContext imports), line 7 (useAuth const), line 91 (useAuth export); retains useCompanies, useCompany, useHistoricalData
- `frontend/src/providers/QueryProvider.tsx` - Removed AuthProvider import and wrapper tags; wraps children directly in QueryClientProvider
- `frontend/src/components/AuthGuard.tsx` - DELETED (imported useAccountQuery from queries.ts; auth-only)
- `frontend/src/providers/AuthProvider.tsx` - DELETED (imported AuthContext from contexts.ts; auth-only)
- `frontend/src/contexts.ts` - DELETED (createContext for AuthContextType; auth-only)
- `frontend/src/lib/queries.ts` - DELETED (useAccountQuery imported useAuth; auth-only)

## Decisions Made

- Deleted all four files wholesale rather than gutting them — each contained only auth symbols with no reusable logic worth preserving
- Modified hooks.ts and QueryProvider.tsx first (Task 1) before deleting dependents (Task 2) to avoid transient compile errors during deletion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - `tsc --noEmit` passed clean on first run after deletions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Frontend auth dead code fully removed; zero auth symbol references in `frontend/src/`
- Ready for Phase 04-03 (backend auth removal)
- `layout.tsx` unchanged — `QueryProvider` default export still resolves correctly

---
*Phase: 04-auth-removal*
*Completed: 2026-05-20*
