---
phase: 04-auth-removal
plan: "01"
subsystem: backend
tags: [auth-removal, cleanup, backend, tsc]
dependency_graph:
  requires: []
  provides: [clean-backend-no-auth]
  affects: [backend/src/app.ts, backend/src/config/config.ts, backend/src/config/database.ts, backend/package.json]
tech_stack:
  added: []
  patterns: []
key_files:
  modified:
    - backend/src/app.ts
    - backend/src/config/config.ts
    - backend/src/config/database.ts
    - backend/package.json
    - backend/package-lock.json
  deleted:
    - backend/src/routes/authRoutes.ts
    - backend/src/middlewares/authMiddleware.ts
    - backend/src/config/passport.ts
    - backend/src/services/authService.ts
    - backend/src/services/userService.ts
    - backend/src/models/user.ts
decisions:
  - Used npm uninstall for package removal to atomically update both package.json and package-lock.json
metrics:
  duration: "~5 minutes"
  completed: "2026-05-21T00:02:04Z"
---

# Phase 04 Plan 01: Auth Removal — Backend Dead Code Cleanup Summary

**One-liner:** Removed all backend auth dead code — 6 files deleted, 3 config files cleaned, 14 auth packages uninstalled; backend compiles clean under tsc --noEmit.

## What Was Done

### Task 1: Remove auth imports and config from cascade files

**backend/src/app.ts** — Removed 7 lines:
- `import passport from 'passport'`
- `import cookieParser from 'cookie-parser'`
- `import authRoutes from './routes/authRoutes'`
- `import './config/passport'`
- `app.use(cookieParser())`
- `app.use(passport.initialize())`
- `app.use('/api/auth', authRoutes)`

**backend/src/config/config.ts** — Removed auth fields:
- Removed from `Config` interface: `jwtSecret`, `googleClientId`, `googleClientSecret`, `googleRedirectUri`
- Removed corresponding entries from `const config` object
- Removed `JWT_SECRET` production validation block (kept `FRONTEND_URL` validation)

**backend/src/config/database.ts** — Removed auth schema:
- Removed `CREATE TABLE IF NOT EXISTS users` block (14-line SQL)
- Removed `DROP TRIGGER IF EXISTS update_users_updated_at` + `CREATE TRIGGER update_users_updated_at` block

**Commit:** `8a2be11`

### Task 2: Delete 6 backend auth source files

Deleted:
- `backend/src/routes/authRoutes.ts`
- `backend/src/middlewares/authMiddleware.ts`
- `backend/src/config/passport.ts`
- `backend/src/services/authService.ts`
- `backend/src/services/userService.ts`
- `backend/src/models/user.ts`

Pre-flight import scan confirmed no orphan imports in lambda or scripts — all imports were only within the auth files themselves and app.ts (already cleaned in Task 1).

**Commit:** `0c30f10`

### Task 3: Uninstall auth packages and verify tsc

Removed 14 packages via `npm uninstall`:

**Runtime dependencies removed:**
- `passport`, `passport-local`, `passport-jwt`, `passport-google-oauth20`
- `bcryptjs`, `jsonwebtoken`, `cookie-parser`

**Type definitions removed:**
- `@types/passport`, `@types/passport-local`, `@types/passport-jwt`, `@types/passport-google-oauth20`
- `@types/cookie-parser`, `@types/bcryptjs`, `@types/jsonwebtoken`

Total: 37 packages removed from node_modules (including transitive).

`cd backend && npx tsc --noEmit` exits 0 with no output.

**Commit:** `b63a785`

## Verification Results

All success criteria met:

| Check | Result |
|-------|--------|
| `grep passport\|cookieParser\|authRoutes backend/src/app.ts` | No matches (PASSED) |
| `grep jwtSecret\|googleClientId\|... backend/src/config/config.ts` | No matches (PASSED) |
| `grep "CREATE TABLE IF NOT EXISTS users\|update_users_updated_at" backend/src/config/database.ts` | No matches (PASSED) |
| All 6 auth files deleted | PASSED |
| `cd backend && npx tsc --noEmit` exits 0 | PASSED |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None - only package removals and file deletions; no new network endpoints, auth paths, or schema additions.

## Self-Check: PASSED

- Modified files verified clean (grep checks all passed)
- All 6 deleted files confirmed absent
- Commits 8a2be11, 0c30f10, b63a785 all exist in git log
- tsc --noEmit exits 0
