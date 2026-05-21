---
phase: 08-pagination
reviewed: 2026-05-21T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - backend/src/tests/companyService.pagination.test.ts
  - backend/src/services/companyService.ts
  - backend/src/routes/companyRoutes.ts
  - frontend/src/lib/useDebounce.ts
  - frontend/src/types/company.ts
  - frontend/src/lib/hooks.ts
  - frontend/src/components/CompaniesTable.tsx
  - frontend/src/app/companies/page.tsx
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-05-21
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Eight files implementing server-side pagination and search were reviewed: the paginated service method, Express route, three frontend hooks/components, a debounce utility, and the test suite. No critical (data-loss, security, or crash) issues were found. The SQL queries use parameterized inputs so there is no SQL injection risk.

Three warnings were identified: LIKE wildcard metacharacter leakage in search input (user-visible correctness bug), an unchecked `rows[0]` access that violates `noUncheckedIndexedAccess` and silently produces `NaN` on empty COUNT results, and a stale-closure risk in a React effect that was suppressed with eslint-disable rather than fixed. Four informational findings cover display edge cases and test-quality issues.

## Warnings

### WR-01: LIKE Metacharacter Leakage in Search — Correctness Bug

**File:** `backend/src/services/companyService.ts:37`
**Issue:** `searchParam` is constructed by naively wrapping the user input in `%…%` without escaping the SQL LIKE metacharacters `%` and `_`. A search string of `%` matches every row (returns the full unpaged dataset as "search results"). A search string of `_` matches any single character in the field. The queries are parameterized so there is no SQL injection risk, but the behavior is incorrect and user-visible: typing `%` in the search box bypasses filtering entirely.
**Fix:**
```typescript
// Escape % and _ before wrapping in wildcards
const escaped = search.toLowerCase().replace(/[%_\\]/g, '\\$&');
const searchParam = search ? '%' + escaped + '%' : null;
```
Add `ESCAPE '\'` to each LIKE clause in both `searchClause` and `searchClauseData`:
```sql
AND (LOWER(c.ticker) LIKE $1 ESCAPE '\' OR LOWER(c.name) LIKE $1 ESCAPE '\' ...)
```

---

### WR-02: Unchecked `rows[0]` on COUNT Result Contradicts `noUncheckedIndexedAccess`

**File:** `backend/src/services/companyService.ts:76`
**Issue:** `noUncheckedIndexedAccess: true` is set in `backend/tsconfig.json`, meaning `countResult.rows[0]` has type `T | undefined` at compile time. The property access `.total` on a potentially undefined value should be a type error. `COUNT(*)` always returns one row in practice, but if the compiler accepts this it means the type annotation on `dbInterface.query` returns `any[]` (bypassing the strictness guard). If `.rows[0]` were ever undefined, `parseInt(undefined, 10)` silently produces `NaN`, which propagates through `totalPages = Math.ceil(NaN / limit)` → `NaN`, surfacing as `"Page NaN of NaN"` in the UI with no error thrown.

**Fix:**
```typescript
const rawTotal = countResult.rows[0]?.total;
const total = rawTotal !== undefined ? parseInt(rawTotal, 10) : 0;
return { data: dataResult.rows, total };
```

---

### WR-03: Stale Closure in Search Effect — Suppressed with eslint-disable

**File:** `frontend/src/components/CompaniesTable.tsx:37-43`
**Issue:** The effect that fires when `debouncedSearch` changes reads `searchQuery` from the enclosing scope but does not list it as a dependency. The comment acknowledges this ("updateUrl omitted from deps intentionally") but the real hazard is `searchQuery`: if URL params change (e.g., browser Back/Forward) at the same moment the debounce timer fires, the effect sees a stale `searchQuery` and the equality check `debouncedSearch !== searchQuery` may incorrectly skip or incorrectly trigger a URL update. The eslint-disable suppresses the warning rather than fixing the dependency graph.

**Fix:** Include `searchQuery` in the dependency array, or restructure so the effect depends only on `debouncedSearch` without comparing against external state:
```typescript
useEffect(() => {
  // Always push the debounced value; let the router deduplicate
  updateUrl(1, debouncedSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [debouncedSearch]);
```
If reset-to-page-1 should only happen on a new search (not on initial render), use a `useRef` to skip the first mount rather than comparing against `searchQuery`.

---

## Info

### IN-01: `totalPages` Displays "Page 1 of 0" on Empty Results

**File:** `backend/src/routes/companyRoutes.ts:15` and `frontend/src/components/CompaniesTable.tsx:220`
**Issue:** When `total === 0`, `Math.ceil(0 / limit)` returns `0`. The route sends `totalPages: 0` and the component renders "Page 1 of 0". The Next button is correctly disabled (`page >= totalPages` → `1 >= 0` → true), but the label is confusing.
**Fix:** Either clamp in the route response:
```typescript
const totalPages = Math.max(1, Math.ceil(total / limit));
```
Or in the component fallback:
```typescript
const totalPages = data?.totalPages ?? 1;  // already defaults to 1, but route must also clamp
```

---

### IN-02: Duplicate `searchClause` / `searchClauseData` Fragments Drift-Prone

**File:** `backend/src/services/companyService.ts:42-43`
**Issue:** Two nearly identical string constants exist solely to switch the bind parameter from `$1` to `$3`. These must be kept in sync manually; if the COUNT query gains additional parameters in future, `searchClauseData` must be updated to renumber the bind index.
**Fix:** Extract a helper that takes the parameter index:
```typescript
const searchClause = (idx: number) =>
  `AND (LOWER(c.ticker) LIKE $${idx} OR LOWER(c.name) LIKE $${idx} OR LOWER(c.sector) LIKE $${idx} OR LOWER(c.industry) LIKE $${idx})`;
// usage:
// ${searchParam ? searchClause(1) : ''}   for count
// ${searchParam ? searchClause(3) : ''}   for data
```

---

### IN-03: `(companyService as any)` in Tests Is Unnecessary

**File:** `backend/src/tests/companyService.pagination.test.ts:17,29,44,58,72`
**Issue:** `getAllCompaniesWithLatestDataPaginated` is a public method on the class (no `private` modifier). Casting to `any` to call it defeats TypeScript's argument type checking in tests and could mask signature mismatches.
**Fix:** Call the method directly through the typed singleton:
```typescript
await companyService.getAllCompaniesWithLatestDataPaginated(1, 10, '');
```

---

### IN-04: Test Mock Reassignment Pattern Is Non-Standard

**File:** `backend/src/tests/companyService.pagination.test.ts:15,26,39,53,68`
**Issue:** `(dbInterface.query as jest.Mock) = mockQuery` replaces the mock via direct property assignment. The idiomatic Jest pattern uses `mockReset()` / `mockImplementation()` on the existing mock reference. The current approach works under CommonJS interop but can break under ESM or when using `jest.isolateModules`. It also means mock state leaks between tests if a test throws before the reassignment.
**Fix:**
```typescript
beforeEach(() => {
  (dbInterface.query as jest.Mock).mockReset();
});

// In each test:
(dbInterface.query as jest.Mock)
  .mockResolvedValueOnce({ rows: [{ total: '10' }] })
  .mockResolvedValueOnce({ rows: [] });
```

---

_Reviewed: 2026-05-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
