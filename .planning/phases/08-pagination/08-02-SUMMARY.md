---
plan: 08-02
phase: 08-pagination
status: complete
completed: 2026-05-21
commits:
  - "feat(08-02): add PaginatedCompaniesResponse type, useDebounce hook, and rewrite useCompanies"
  - "feat(08-02): rewrite CompaniesTable for URL-synced pagination and add Suspense boundary"
key-files:
  created:
    - frontend/src/lib/useDebounce.ts
  modified:
    - frontend/src/types/company.ts
    - frontend/src/lib/hooks.ts
    - frontend/src/components/CompaniesTable.tsx
    - frontend/src/app/companies/page.tsx
---

## Summary

Converted the company list from a full-500-row client-side fetch with `useMemo` filter to a server-driven, URL-synced paginated list with debounced search. The URL is now the single source of truth for both `page` and `search`.

### What Was Built

**Task 1 — Types, debounce hook, rewritten useCompanies:**
- Added `PaginatedCompaniesResponse` interface to `frontend/src/types/company.ts` with fields `data`, `total`, `page`, `limit`, `totalPages`
- Created `frontend/src/lib/useDebounce.ts` — generic hook with `setTimeout`/`clearTimeout` cleanup
- Replaced the old no-arg `useCompanies()` with `useCompanies(page, search)` using React Query key `['companies', page, search]`, `placeholderData: keepPreviousData`, and conditional `search` param (omitted when empty to avoid spurious `?search=` in API calls)

**Task 2 — CompaniesTable rewrite + Suspense boundary:**
- Removed `useMemo`/`filteredCompanies` client-side filter entirely
- Derives `page` and `searchQuery` from `useSearchParams()`; keeps `searchInput` as controlled state synced via `useEffect([searchQuery])` to fix browser back/forward stale-input bug
- `updateUrl()` helper calls `router.replace(..., { scroll: false })` once — prevents double-fetch on search (Pitfall 4)
- Debounce effect fires `updateUrl(1, debouncedSearch)` only when value diverges from URL (no unnecessary navigation)
- Pagination controls: "Page N of M" always visible; Prev disabled on page 1, Next disabled on last page
- "Showing N result(s)" count shown when search is active; × clear button resets to page 1
- `frontend/src/app/companies/page.tsx` rewritten as a Server Component with `<Suspense>` wrapping `<CompaniesTable />` — required for static export with `useSearchParams()`

### Verification

- `npm run build` → exit 0; 509 static pages generated; `/companies` compiled as `○ (Static)` with no Suspense boundary error
- `npx tsc --noEmit` → clean
- Human verification (approved 2026-05-21): all 6 browser behaviors confirmed with live S&P 500 data

### Self-Check: PASSED

All must-haves satisfied:
- ✓ Clicking Next/Prev navigates between pages and URL updates to `?page=N`
- ✓ Refreshing at `?page=3` renders page 3 without resetting to page 1
- ✓ Search debounces at 300ms, resets to page 1 on new query, shows "Showing N results", has × clear button
- ✓ Prev disabled on page 1; Next disabled on last page; "Page N of M" always visible
- ✓ Browser back/forward keeps search input in sync with URL
- ✓ `next build` succeeds (Suspense boundary present)
