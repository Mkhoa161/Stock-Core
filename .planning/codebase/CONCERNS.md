# Codebase Concerns

**Analysis Date:** 2026-05-19

## Tech Debt

**Single PostgreSQL Client (No Connection Pool):**
- Issue: `backend/src/config/database.ts` uses `new Client(connectionString)` — a single persistent `pg.Client` instance shared across all requests. This does not pool connections and will fail under concurrent load.
- Files: `backend/src/config/database.ts` (line 8), all services via `dbInterface.query()`
- Impact: Each concurrent API call shares one socket. Under load this causes serialized queries, timeouts, and eventual connection drops. `pg.Pool` is the standard fix.
- Fix approach: Replace `new Client(...)` with `new Pool({ ...config, max: 10 })` and export the pool. All call sites already use `dbInterface.query()` so the interface change is contained.

**market_cap Stored as 0 for Historical Data:**
- Issue: `createStockPrice` in `backend/src/services/historicalDataService.ts` (line 348) and `backend/src/services/companyService.ts` (line 211) always passes `market_cap: 0` with a comment "Will be updated later" — this update never happens. The `stock_prices` table therefore holds permanently incorrect market cap data.
- Files: `backend/src/services/historicalDataService.ts:348`, `backend/src/services/companyService.ts:211`
- Impact: Any query relying on `market_cap` in `stock_prices` returns zeros, making the field useless.
- Fix approach: Either populate market cap from the Yahoo Finance quote at caching time, or drop the column from `stock_prices` since `daily_summaries` already stores it per-day.

**Hardcoded Popular Ticker List:**
- Issue: `backend/src/lambda/dailyDataCollector.ts` (line 163) hardcodes `['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM']` as the only companies that receive historical data collection. All other S&P 500 companies scraped in Step 1 never get historical data.
- Files: `backend/src/lambda/dailyDataCollector.ts:163`
- Impact: Historical chart is unavailable for ~490 of 500 companies.
- Fix approach: Remove the filter; iterate all companies. Add rate-limit pacing that already exists in the Yahoo Finance service.

**Static Export With Dynamic Routes:**
- Issue: `frontend/next.config.ts` uses `output: 'export'` (static HTML export). Dynamic routes like `/company/[ticker]` require `generateStaticParams()`. The fallback in `frontend/src/app/company/[ticker]/page.tsx` only pre-renders 5 hardcoded tickers (AAPL, GOOG, MSFT, AMZN, TSLA). All other tickers 404 at runtime on S3.
- Files: `frontend/next.config.ts`, `frontend/src/app/company/[ticker]/page.tsx`
- Impact: Navigating directly to any non-hardcoded ticker on the deployed site returns a 404.
- Fix approach: Either (a) remove `output: 'export'` and deploy Next.js as a server, or (b) fetch all tickers from the API during `generateStaticParams` and rebuild on each data update.

**AuthProvider Not Mounted in Layout:**
- Issue: `frontend/src/app/layout.tsx` wraps children in `QueryProvider` but does NOT include `AuthProvider`. The `AuthContext` is therefore at its default (never-loggedIn) value. `AuthGuard` depends on this context. The auth flows (login, Google OAuth) are wired but the session state is not propagated to the UI.
- Files: `frontend/src/app/layout.tsx`, `frontend/src/providers/AuthProvider.tsx`
- Impact: The `loggedIn` state is always `false` everywhere; logged-in UX and any protected routes will not work correctly.
- Fix approach: Add `<AuthProvider>` inside `<QueryProvider>` in `layout.tsx`.

**Pervasive `any` Typing:**
- Issue: 146 occurrences of `: any` or `as any` across backend source. Key examples: `req.user?: any` in `authMiddleware.ts:7`, `jwt.verify(...) as any` in `authService.ts:19`, `params: any[]` in `historicalDataService.ts:205`, `updates: any` in `authRoutes.ts:141`.
- Files: Throughout `backend/src/` — worst in `authRoutes.ts`, `authMiddleware.ts`, `companyService.ts`, `userService.ts`
- Impact: Eliminates type safety; errors in user-object shape or query parameter types go undetected until runtime.
- Fix approach: Define proper TypeScript interfaces for `AuthenticatedUser`, query parameter objects, and JWT payload. Replace `as any` on `jwt.verify` with a typed payload interface.

**All Companies Fetched Without Pagination:**
- Issue: `companyService.getAllCompanies()` and `getAllCompaniesWithLatestData()` use `SELECT * FROM companies` with no `LIMIT`/`OFFSET`. The S&P 500 is ~500 rows; the entire set is returned and rendered client-side on every page load.
- Files: `backend/src/services/companyService.ts:7-29`, `backend/src/routes/companyRoutes.ts:8-15`
- Impact: As the dataset grows beyond S&P 500, query and payload sizes grow unboundedly. Client-side filtering over 500+ rows is workable today but will degrade.
- Fix approach: Add pagination parameters (`page`, `limit`) to the `/api/companies` endpoint, or add server-side search/filter to avoid fetching all rows.

**Dual Authentication Code Paths:**
- Issue: Three separate authentication mechanisms exist: (1) `authenticateToken` using Passport JWT + manual fallback, (2) `authenticateTokenDirect` using `AuthService` directly, and (3) `optionalAuth` using Passport. The manual fallback in `authMiddleware.ts:26-63` duplicates what `authenticateTokenDirect` does. Only one path is used in routes, but the dead code adds confusion.
- Files: `backend/src/middlewares/authMiddleware.ts`, `backend/src/routes/authRoutes.ts`, `backend/src/routes/companyRoutes.ts`
- Impact: Maintenance risk; inconsistent token validation behavior if the paths diverge.
- Fix approach: Pick one mechanism (Passport JWT preferred) and remove the others.

---

## Known Bugs

**Date Completeness Check Logic Flaw:**
- Symptoms: The `checkDataCompleteness` method in `historicalDataService.ts` (line 139) checks `firstDate <= startDate` but both are `Date` objects compared with `<=`, which compares object references, not values. This likely always returns `false` when the dates happen to be equal, causing unnecessary API refetches.
- Files: `backend/src/services/historicalDataService.ts:164-171`
- Trigger: Any request where cached data exactly covers the requested range
- Workaround: None; the fallback to API call is safe but wastes Yahoo Finance quota.

**OAuth CSRF State Not Verified:**
- Symptoms: The Google OAuth route in `authRoutes.ts` generates a `state` parameter with `Math.random()` (line 176) but never stores it in session or verifies it on callback. The Google callback at `/auth/google/callback` uses `passport.authenticate('google', ...)` which also does not verify the state.
- Files: `backend/src/routes/authRoutes.ts:168-213`
- Trigger: Always present — any attacker can craft an OAuth callback URL without a valid state check
- Workaround: None currently

**`useAccountQuery` Calls Non-Existent Endpoint:**
- Symptoms: `frontend/src/lib/queries.ts` calls `api.get("/accounts/me")` but the backend has no `/accounts/me` route — only `/api/auth/profile`. This will always 404.
- Files: `frontend/src/lib/queries.ts:11`, `backend/src/routes/authRoutes.ts` (profile at `/api/auth/profile`)
- Trigger: Any component using `useAccountQuery`
- Workaround: None — `AuthGuard` uses this query and will always treat users as unauthenticated

---

## Security Considerations

**No HTTP Security Headers:**
- Risk: The Express server has no `helmet` middleware. Responses lack `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, and similar headers.
- Files: `backend/src/app.ts`
- Current mitigation: None
- Recommendations: Add `helmet` package (`npm install helmet`) and `app.use(helmet())` in `app.ts`.

**No API Rate Limiting:**
- Risk: The Express API has no rate-limiting middleware. Auth endpoints (`/api/auth/login`, `/api/auth/register`) are open to brute-force attacks. Data endpoints have no protection against scrapers.
- Files: `backend/src/app.ts`, `backend/src/routes/authRoutes.ts`
- Current mitigation: None
- Recommendations: Add `express-rate-limit` to auth routes (e.g., 10 attempts per 15 minutes per IP).

**JWT Secret Falls Back to `dev-secret-key` in Development:**
- Risk: `config.ts` (line 26) sets `jwtSecret` to `'dev-secret-key'` when `JWT_SECRET` env var is absent in non-production environments. If a developer runs locally without `.env`, any token signed with `dev-secret-key` is trivially forgeable.
- Files: `backend/src/config/config.ts:26`
- Current mitigation: Production throws an error if secret is missing or equals the dev default.
- Recommendations: Require `JWT_SECRET` in all environments, or warn loudly if default is used.

**Weak OAuth CSRF State Generation:**
- Risk: `Math.random()` is not cryptographically secure. The OAuth state parameter used for CSRF prevention should use `crypto.randomBytes()`.
- Files: `backend/src/routes/authRoutes.ts:176`
- Current mitigation: State parameter generated but never verified on callback
- Recommendations: Use `crypto.randomBytes(16).toString('hex')`, store in session, and verify on callback.

**Database Password in `docker-compose.yml` is Plaintext:**
- Risk: `docker-compose.yml` has `POSTGRES_PASSWORD: postgres` and `DB_PASSWORD=postgres` as plaintext inline env vars. While acceptable for local dev, these are committed to version control and could be confused for production values.
- Files: `backend/docker-compose.yml`
- Current mitigation: Values are obviously development defaults
- Recommendations: Use `.env` file in docker-compose (via `env_file:` directive) for any sensitive values, even in development, to build the habit.

**Hardcoded EC2 URL in Frontend:**
- Risk: `frontend/src/lib/api.ts` (line 12) contains `'https://your-ec2-public-ip:3000'` as a literal fallback when `NEXT_PUBLIC_API_BASE_URL` is absent in production. This URL is a placeholder that will fail silently; worse, if a real IP is ever placed here, it leaks infrastructure details via the static bundle.
- Files: `frontend/src/lib/api.ts:12`
- Current mitigation: Production build throws if `NEXT_PUBLIC_API_BASE_URL` is not set (line 15-17)
- Recommendations: Remove the EC2 fallback string; rely solely on the environment variable.

**`SELECT *` on Users Table Returns Password Hash:**
- Risk: `userService.ts` uses `SELECT * FROM users` in `findByEmail`, `findByGoogleId`, and `getUserById`. The raw `password` hash is returned in the user object. It is only stripped by the `sanitizeUser` utility in routes — but not in all middleware paths (e.g., `req.user` in `authenticateToken` contains the hash).
- Files: `backend/src/services/userService.ts:36,42,48`
- Current mitigation: `sanitizeUser` strips password before JSON responses
- Recommendations: Exclude `password` in SQL queries: `SELECT id, email, username, first_name, last_name, google_id, avatar, created_at, updated_at FROM users`.

---

## Performance Bottlenecks

**Yahoo Finance Rate Limiting — Sequential Requests with 1.5s Delay:**
- Problem: `yahooFinanceService.ts` makes one API call per symbol sequentially, with a 1500ms hard delay between each (`await this.delay(BASE_DELAY_MS)` at lines 85, 141). Processing all 500 S&P 500 companies for market data takes 500 × 1.5s = ~12 minutes minimum.
- Files: `backend/src/services/yahooFinanceService.ts:85,141`
- Cause: Yahoo Finance unofficial API rate limits; no concurrent batching is possible without hitting limits.
- Improvement path: The Lambda 15-minute timeout will be approached with 500 tickers. Consider caching aggressively so only stale companies are refreshed, not all companies every run.

**N+1 Pattern in Historical Data Caching:**
- Problem: `historicalDataService.cacheHistoricalData()` loops through each day and calls `companyService.createStockPrice()` individually — one INSERT per row, in a for loop.
- Files: `backend/src/services/historicalDataService.ts:336-361`
- Cause: No bulk insert implementation
- Improvement path: Use a single `INSERT INTO stock_prices (...) VALUES ... ON CONFLICT DO UPDATE` with all rows, or use `pg`'s `COPY` command for bulk loads.

**`getAllCompaniesWithLatestData` Correlated Subquery:**
- Problem: The query in `companyService.ts:13-29` uses a correlated subquery `SELECT MAX(date) FROM daily_summaries WHERE company_id = c.id` evaluated per row. For 500 companies this executes 500 subqueries.
- Files: `backend/src/services/companyService.ts:13-29`
- Cause: Suboptimal SQL pattern
- Improvement path: Replace with a `LATERAL JOIN` or a CTE that computes the max date per company first: `WITH latest AS (SELECT company_id, MAX(date) as max_date FROM daily_summaries GROUP BY company_id)`.

**ECharts Not Disposed on Window Resize:**
- Problem: `CompanyDetail.tsx` initializes an ECharts instance in `useEffect` but disposes it only on component unmount. Window resize events are not handled — the chart does not resize responsively.
- Files: `frontend/src/components/CompanyDetail.tsx:42-87`
- Cause: No resize observer or window resize listener attached
- Improvement path: Add `const handleResize = () => myChart.resize()` with `window.addEventListener('resize', handleResize)` inside the effect, cleaned up on dispose.

---

## Fragile Areas

**Database Initialization on Import:**
- Files: `backend/src/config/database.ts`
- Why fragile: `initializeDatabase()` is called at module load time (line 129). Any file that imports `database.ts` triggers a live database connection attempt. This makes unit testing impossible without a real database, and causes silent failures if the DB is unreachable at startup (the `process.exit(1)` is abrupt).
- Safe modification: Delay initialization to explicit startup in `server.ts`. Export a `connect()` function and call it from the server entry point.
- Test coverage: Tests connect to a real database; no mock/stub pattern exists.

**Single Test File for Entire Backend:**
- Files: `backend/src/tests/database.test.ts`
- Why fragile: One integration test file covers all backend functionality. Tests share state: a test company created in test 2 is used in tests 3-5 (dependent on execution order). If the company creation test fails, all downstream tests fail.
- Safe modification: Add `afterAll` cleanup to delete test data. Use isolated test data per test.
- Test coverage: No unit tests; no frontend tests at all; no mock for Yahoo Finance API.

**`DailyDataCollector` Error Array Accumulates Across Re-use:**
- Files: `backend/src/lambda/dailyDataCollector.ts:21`
- Why fragile: `errors: string[] = []` is initialized in the class constructor. A new `DailyDataCollector` instance is created per Lambda invocation (line 314), so this is fine currently. However, if the class is ever reused (e.g., in tests or script runners), errors from a previous run will pollute the next run's result.
- Safe modification: Keep current per-invocation instantiation pattern. Add a comment warning against reuse.

**ECharts Instance Not Tracked Across Re-renders:**
- Files: `frontend/src/components/CompanyDetail.tsx:42-87`
- Why fragile: The `useEffect` re-runs whenever `filteredData` or `ticker` changes, calling `echarts.init(chartRef.current)` on an already-initialized container. ECharts silently returns the existing instance in this case, but the returned instance is disposed at the end of the same effect via the cleanup function. This creates a race condition where the chart may be disposed while another render is initializing it.
- Safe modification: Use `echarts.getInstanceByDom(chartRef.current) || echarts.init(chartRef.current)` to reuse the existing instance; only call `setOption` to update.
- Test coverage: No frontend tests.

---

## Scaling Limits

**Lambda Execution Time:**
- Current capacity: AWS Lambda hard limit is 15 minutes. The daily collection processes all ~500 S&P 500 companies sequentially with 1.5s delays between Yahoo Finance calls.
- Limit: 500 companies × 1.5s = 12.5 minutes for market data alone. Adding historical data collection for all tickers would exceed 15 minutes.
- Scaling path: Parallelize across multiple Lambda functions (one per sector), or use a queue-based approach (SQS + Lambda fan-out).

**No Database Migration System:**
- Current capacity: Tables are created via `CREATE TABLE IF NOT EXISTS` in `database.ts`. Schema changes require manual ALTER TABLE or deleting and recreating tables.
- Limit: Any column addition, index change, or constraint modification must be manually applied to production.
- Scaling path: Add a migration tool such as `node-pg-migrate` or `flyway`. All schema changes should be version-controlled migrations.

---

## Dependencies at Risk

**Yahoo Finance Unofficial API (`yahoo-finance2` v2.13.3):**
- Risk: `yahoo-finance2` relies on Yahoo Finance's undocumented endpoints. Yahoo has previously broken, rate-limited, or paywalled these endpoints without notice.
- Impact: Entire data pipeline (market data, historical prices, company profiles) goes dark if Yahoo changes the API.
- Migration plan: Abstract data fetching behind a `MarketDataProvider` interface so a paid provider (Alpha Vantage, Polygon.io, Finnhub) can be swapped in. The deleted `fmpService.ts` suggests this migration was previously started.

**`express` v5.1.0 (Still Pre-Release Behavior):**
- Risk: Express 5 was released as stable in late 2024 but has limited community adoption and some breaking changes from v4 (async error handling, route params behavior).
- Impact: Community plugins, tutorials, and StackOverflow answers targeting Express 4 may not apply.
- Migration plan: Monitor for breakage; test error handling paths carefully since Express 5 now propagates async errors automatically.

---

## Missing Critical Features

**No Database Migration System:**
- Problem: Schema is managed via `CREATE TABLE IF NOT EXISTS` in application code. There is no way to evolve the schema (add columns, change types, add indices) safely in production without downtime or data loss.
- Blocks: Any future schema evolution (e.g., adding `pe_ratio`, `52wk_high` columns).

**No Input Validation Layer:**
- Problem: No schema validation library (Joi, Zod, express-validator) is used. Input validation is manual and inconsistent — email and password are validated in auth routes but ticker parameters in company routes have no format validation.
- Blocks: Reliable API contract enforcement; integration with API documentation tools.

**No Logging Infrastructure:**
- Problem: All observability relies on `console.log`/`console.error` (168 occurrences in backend). There is no structured logging, log levels, or log aggregation. In AWS Lambda, logs go to CloudWatch but are unstructured and unsearchable.
- Blocks: Production debugging, alerting, and monitoring.

**No Refresh Token / Token Rotation:**
- Problem: JWTs are issued with 24-hour expiry and no refresh mechanism. A stolen JWT is valid until expiry; there is no revocation capability (no token blacklist or database-tracked sessions).
- Blocks: Secure auth for any sensitive data features.

---

## Test Coverage Gaps

**No Frontend Tests:**
- What's not tested: All React components (`CompaniesTable`, `CompanyDetail`, `Navigation`, `AuthGuard`, `AuthProvider`), all hooks (`useCompanies`, `useCompany`, `useHistoricalData`), and the API client (`api.ts`).
- Files: Entire `frontend/src/` directory
- Risk: UI regressions, broken API integration, and failed auth flows go undetected.
- Priority: High

**No Unit Tests for Backend Services:**
- What's not tested: `yahooFinanceService.ts`, `historicalDataService.ts`, `authService.ts`, `userService.ts` — all services are only tested indirectly via the integration test that requires a live PostgreSQL connection.
- Files: `backend/src/services/` (all files)
- Risk: Business logic bugs in caching, completeness checks, and auth are undetected without a real database.
- Priority: High

**No Middleware or Route Tests:**
- What's not tested: `authMiddleware.ts` (all three variants), all route handlers in `authRoutes.ts` and `companyRoutes.ts`.
- Files: `backend/src/middlewares/`, `backend/src/routes/`
- Risk: Auth bypass, route error handling failures.
- Priority: High

**Integration Test Leaves Test Data in Database:**
- What's not tested: The `afterAll` cleanup in `database.test.ts` only logs a message — it does not delete the test company or stock price records created during the test run. Each test run pollutes the database with a new `T<timestamp>` ticker.
- Files: `backend/src/tests/database.test.ts:8-11`
- Risk: Test database accumulates stale test data; tests may fail if the test ticker format exceeds 10 characters.
- Priority: Medium

---

*Concerns audit: 2026-05-19*
