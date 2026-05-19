<!-- refreshed: 2026-05-19 -->
# Architecture

**Analysis Date:** 2026-05-19

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 15)                         │
│                         `frontend/src/`                               │
├───────────────────┬──────────────────────┬───────────────────────────┤
│  Pages / Routes   │   React Components   │   Providers / Context      │
│  `app/`           │  `components/`       │  `providers/`, `contexts.ts`│
└────────┬──────────┴──────────┬───────────┴───────────┬───────────────┘
         │                     │                        │
         ▼                     ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│              Frontend Data Layer (TanStack Query + fetch)             │
│          `frontend/src/lib/hooks.ts`, `frontend/src/lib/api.ts`       │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTP (cookies + JSON)
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Backend API (Express + TypeScript)                   │
│                       `backend/src/`                                  │
├──────────────────┬───────────────────────┬───────────────────────────┤
│  Routes          │  Middlewares           │  Services                 │
│  `routes/`       │  `middlewares/`        │  `services/`              │
└────────┬─────────┴───────────────────────┴───────────┬───────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────────┐              ┌──────────────────────────────────┐
│  PostgreSQL DB       │              │  Yahoo Finance API (external)    │
│  `config/database.ts`│◄────────────│  `services/yahooFinanceService.ts`│
└─────────────────────┘              └──────────────────────────────────┘
         ▲
         │
┌─────────────────────┐
│  AWS Lambda          │
│  `lambda/dailyDataCollector.ts` │
│  (scheduled 24h)    │
└─────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Express app | HTTP server, CORS, middleware wiring | `backend/src/app.ts` |
| server entry | Start HTTP listener | `backend/src/server.ts` |
| authRoutes | Register, login, logout, profile, Google OAuth | `backend/src/routes/authRoutes.ts` |
| companyRoutes | List companies, company detail, historical data | `backend/src/routes/companyRoutes.ts` |
| CompanyService | Raw DB queries for companies, stock prices, daily summaries | `backend/src/services/companyService.ts` |
| HistoricalDataService | Lazy-loading cache layer: DB first, Yahoo Finance fallback | `backend/src/services/historicalDataService.ts` |
| YahooFinanceService | External API wrapper for quotes, historical data, profiles | `backend/src/services/yahooFinanceService.ts` |
| AuthService | JWT sign/verify, login/register orchestration | `backend/src/services/authService.ts` |
| UserService | User CRUD, password hashing, Google ID lookup | `backend/src/services/userService.ts` |
| DailyDataCollector (Lambda) | Scheduled: scrape S&P 500, update profiles, collect historical data | `backend/src/lambda/dailyDataCollector.ts` |
| scrapeSP500 | Scrape Wikipedia for S&P 500 ticker/name list | `backend/src/scripts/scrapeSP500.ts` |
| database config | PostgreSQL client, table creation, indexes, triggers | `backend/src/config/database.ts` |
| passport config | Local, JWT, and Google OAuth Passport strategies | `backend/src/config/passport.ts` |
| authMiddleware | JWT token extraction from header or cookie, Passport auth | `backend/src/middlewares/authMiddleware.ts` |
| errorHandler | Global Express error handler | `backend/src/middlewares/errorHandler.ts` |
| Next.js layout | Root layout, QueryProvider wrapping | `frontend/src/app/layout.tsx` |
| CompaniesTable | Client component, paginated company list with search | `frontend/src/components/CompaniesTable.tsx` |
| CompanyDetail | Client component, candlestick chart (ECharts), OHLCV table | `frontend/src/components/CompanyDetail.tsx` |
| QueryProvider | Wraps app with TanStack QueryClient + AuthProvider | `frontend/src/providers/QueryProvider.tsx` |
| AuthProvider | Auth state via localStorage flag + React context | `frontend/src/providers/AuthProvider.tsx` |
| hooks | React Query hooks: useCompanies, useCompany, useHistoricalData, useAuth | `frontend/src/lib/hooks.ts` |
| api | Typed fetch wrapper (get, post, put, del) with cookie credentials | `frontend/src/lib/api.ts` |

## Pattern Overview

**Overall:** Layered monorepo — separate frontend (Next.js) and backend (Express) apps communicating over REST API. Backend uses a service-oriented layer over raw SQL. Frontend uses React Query for server state with a cookie-based auth model.

**Key Characteristics:**
- No ORM — all database access uses raw PostgreSQL parameterized queries via `pg` Client
- Single PostgreSQL client instance created at module load time (`backend/src/config/database.ts`), shared across all services via `dbInterface` import
- Historical data uses a DB-first cache pattern: check database completeness, fall back to Yahoo Finance API, then write-through to DB
- Frontend auth state is tracked via a `localStorage` boolean flag (`__stock_insight_logged_in__`); the actual session token lives in an HTTP-only cookie
- Frontend is configured for static export (`next export`) with `generateStaticParams` on the `[ticker]` route

## Layers

**Routes Layer:**
- Purpose: HTTP request parsing, input validation, response serialization
- Location: `backend/src/routes/`
- Contains: `authRoutes.ts`, `companyRoutes.ts`
- Depends on: Services, middlewares, utils
- Used by: Express app (`backend/src/app.ts`)

**Services Layer:**
- Purpose: Business logic — data fetching, caching, auth orchestration
- Location: `backend/src/services/`
- Contains: `companyService.ts`, `historicalDataService.ts`, `yahooFinanceService.ts`, `authService.ts`, `userService.ts`
- Depends on: Database config, external Yahoo Finance API, models
- Used by: Routes, Lambda

**Data Access:**
- Purpose: Raw SQL execution against PostgreSQL
- Location: `backend/src/config/database.ts`
- Contains: Single `pg.Client` instance, `initializeDatabase()`, `createTables()`
- Depends on: `config.ts` for connection string
- Used by: All services via `import dbInterface from '../config/database'`

**Models Layer:**
- Purpose: TypeScript interfaces only — no ORM, no class instances
- Location: `backend/src/models/`
- Contains: `company.ts` (Company, StockPrice, DailySummary, input types), `user.ts` (User, CreateUserInput)
- Depends on: Nothing
- Used by: Services, routes

**Lambda / Automation:**
- Purpose: Scheduled daily data ingestion
- Location: `backend/src/lambda/`
- Contains: `dailyDataCollector.ts` — AWS Lambda handler + `DailyDataCollector` class
- Depends on: Services, scripts
- Used by: AWS EventBridge (24-hour schedule)

**Frontend Pages:**
- Purpose: Route-level page components
- Location: `frontend/src/app/`
- Contains: `page.tsx` (welcome), `companies/page.tsx` (list), `company/[ticker]/page.tsx` (detail)
- Depends on: Components, providers
- Used by: Next.js router

**Frontend Components:**
- Purpose: Reusable UI pieces with data-fetching hooks
- Location: `frontend/src/components/`
- Contains: `CompaniesTable.tsx`, `CompanyDetail.tsx`, `Navigation.tsx`, `AuthGuard.tsx`
- Depends on: `lib/hooks.ts`, `lib/utils.ts`
- Used by: Pages

**Frontend Data Layer:**
- Purpose: API communication and React Query integration
- Location: `frontend/src/lib/`
- Contains: `api.ts` (fetch wrapper), `hooks.ts` (React Query hooks), `queries.ts`, `utils.ts`
- Depends on: `NEXT_PUBLIC_API_BASE_URL` env var
- Used by: Components

## Data Flow

### Company List Request (Frontend to Database)

1. `CompaniesTable` mounts, calls `useCompanies()` hook (`frontend/src/lib/hooks.ts:10`)
2. React Query calls `api.get("/api/companies/")` (`frontend/src/lib/api.ts:76`)
3. Request hits `GET /api/companies` route (`backend/src/routes/companyRoutes.ts:8`)
4. `companyService.getAllCompaniesWithLatestData()` runs JOIN query across `companies` + `daily_summaries` (`backend/src/services/companyService.ts:12`)
5. PostgreSQL returns rows via `dbInterface.query()` (`backend/src/config/database.ts`)
6. Route returns JSON array; React Query caches for 5 minutes

### Historical Data Request (Lazy Cache Pattern)

1. `CompanyDetail` calls `useHistoricalData({ ticker, from, to, days })` (`frontend/src/lib/hooks.ts:68`)
2. `api.get("/api/companies/:ticker/historical", params)` fires (`frontend/src/lib/api.ts:76`)
3. Route handler validates date range, calls `historicalDataService.getHistoricalData()` (`backend/src/routes/companyRoutes.ts:40`)
4. `HistoricalDataService` queries `stock_prices` from DB first (`backend/src/services/historicalDataService.ts:72`)
5. If data incomplete: calls `yahooFinanceService.getBulkHistoricalData()` (`backend/src/services/historicalDataService.ts:91`)
6. `YahooFinanceService` uses `yahoo-finance2` library with exponential backoff retry (`backend/src/services/yahooFinanceService.ts:95`)
7. API data is written back to `stock_prices` table via `companyService.createStockPrice()` (`backend/src/services/historicalDataService.ts:114`)
8. Response includes `source: 'database'|'api'` and `cached: boolean` metadata

### Daily Data Collection (Lambda)

1. AWS EventBridge triggers Lambda handler every 24 hours (`backend/src/lambda/dailyDataCollector.ts:296`)
2. Step 1: `scrapeSP500Companies()` scrapes Wikipedia, adds new tickers to DB (`backend/src/scripts/scrapeSP500.ts:13`)
3. Step 2: `updateCompanyProfilesAndMarketData()` calls Yahoo Finance in batches of 10, updates `companies` + `daily_summaries` tables
4. Step 3: `collectHistoricalData()` fetches 60 days of OHLCV for 10 popular tickers
5. Step 4: `cleanupOldHistoricalData()` deletes `stock_prices` records older than 60 days

### Auth Flow

1. Login POST to `/api/auth/login` (`backend/src/routes/authRoutes.ts:76`)
2. Passport Local Strategy validates email/password via `userService.findByEmail()` + `verifyPassword()`
3. `authService.generateToken()` creates JWT signed with `JWT_SECRET` (`backend/src/services/authService.ts:8`)
4. JWT set in HTTP-only cookie `stock-insight-token` (24h expiry)
5. Frontend `AuthProvider` sets `localStorage` flag (`frontend/src/providers/AuthProvider.tsx:34`)
6. Protected routes: `authenticateToken` middleware tries Passport JWT strategy, falls back to manual token extraction from header or cookie (`backend/src/middlewares/authMiddleware.ts:10`)

## Key Abstractions

**dbInterface (pg.Client singleton):**
- Purpose: Single PostgreSQL client shared across all services
- Examples: `backend/src/config/database.ts` (exported as `client`)
- Pattern: Module-level singleton — imported as `dbInterface` by all services. Tables are created on first connect via `initializeDatabase()` at module load time.

**Service singletons:**
- Purpose: Stateless service classes exported as module-level instances
- Examples: `companyService`, `historicalDataService`, `yahooFinanceService`, `authService`, `userService` — each exported at bottom of their respective file
- Pattern: `export const companyService = new CompanyService()`

**React Query hooks:**
- Purpose: Typed async data fetching with caching
- Examples: `useCompanies`, `useCompany`, `useHistoricalData` in `frontend/src/lib/hooks.ts`
- Pattern: `useQuery({ queryKey, queryFn, staleTime: 5min, gcTime: 10min })`

**YahooFinanceService retry wrapper:**
- Purpose: Exponential backoff on Yahoo Finance rate limits (429 / Too Many Requests)
- Examples: `backend/src/services/yahooFinanceService.ts:39` (`withRetry`)
- Pattern: `MAX_RETRIES=3`, `BASE_DELAY_MS=1500ms`, doubles on each retry

## Entry Points

**HTTP Server:**
- Location: `backend/src/server.ts`
- Triggers: `node dist/server.js` or Docker entrypoint
- Responsibilities: Bind Express app to `config.port` (default 3000)

**AWS Lambda:**
- Location: `backend/src/lambda/dailyDataCollector.ts` (`handler` export)
- Triggers: AWS EventBridge scheduled event (24h) or manual invocation
- Responsibilities: Full daily data collection pipeline

**Next.js App:**
- Location: `frontend/src/app/layout.tsx`
- Triggers: Next.js dev server or static export build
- Responsibilities: Root layout with QueryProvider + AuthProvider, Navigation

**One-off Scripts:**
- `backend/src/scripts/scrapeSP500.ts` — run with `node` directly to seed DB
- `backend/src/scripts/testLambda.ts`, `testLambdaSimple.ts` — local Lambda testing

## Architectural Constraints

- **Database client:** Single `pg.Client` instance (not a pool) created at module load; all requests share one connection. This is a scaling constraint — concurrent requests queue behind a single connection.
- **Global state:** `dbInterface` singleton in `backend/src/config/database.ts`; service singletons in each `services/*.ts` file
- **Historical data cap:** `MAX_DAYS = 60` hardcoded in `HistoricalDataService`; requests for ranges > 60 days are capped
- **Static export:** Frontend is configured for `next export`; dynamic routes require `generateStaticParams()` at build time (`frontend/src/app/company/[ticker]/page.tsx:8`)
- **Yahoo Finance rate limiting:** `YahooFinanceService` inserts a `1500ms` delay between every symbol fetch, making bulk operations slow at scale
- **No circular imports:** Services depend on `config/database` and `models` only; routes depend on services only

## Anti-Patterns

### pg.Client instead of pg.Pool

**What happens:** A single `pg.Client` is instantiated at module load in `backend/src/config/database.ts` and shared by all services.
**Why it's wrong:** A single client handles one query at a time; concurrent requests will queue or fail under load.
**Do this instead:** Replace with `pg.Pool` from the `pg` package. Export `pool.query()` in the same interface so all service call sites remain unchanged.

### Auth state relies on localStorage boolean

**What happens:** `AuthProvider` tracks login state via a `localStorage` key (`__stock_insight_logged_in__`) rather than by actually verifying the session cookie (`frontend/src/providers/AuthProvider.tsx:6-19`).
**Why it's wrong:** localStorage and cookie state can diverge — clearing cookies or expiring the JWT does not clear the localStorage flag, leaving the UI in an inconsistent "logged in" state.
**Do this instead:** On app mount, verify the session by hitting `/api/auth/profile`; use the response to set auth state.

### Inline SQL in service methods

**What happens:** All database queries are hand-written SQL strings inside service class methods (e.g., `backend/src/services/companyService.ts`).
**Why it's wrong:** No query builder means no composability, type safety, or migration tooling; schema drift is undetected until runtime.
**Do this instead:** Adopt a query builder (e.g., Kysely) or lightweight migration tool (e.g., node-pg-migrate) to manage schema and queries.

## Error Handling

**Strategy:** Try/catch at route handlers and service methods; global Express error handler for uncaught middleware errors.

**Patterns:**
- Routes catch errors and return structured JSON: `{ message: string, error?: string }` with appropriate HTTP status codes
- Services log errors with `console.error` and re-throw or return empty/null results
- `YahooFinanceService` swallows per-symbol errors and continues processing remaining symbols
- Global handler: `backend/src/middlewares/errorHandler.ts` — logs error, responds with `err.status || 500`
- Lambda: catches all top-level errors and returns `500` response with error details

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` throughout; no structured logging library. Lambda and service methods use emoji prefixes for visual scanning (e.g., `✅`, `❌`, `📈`).
**Validation:** Input validation done inline in route handlers (email regex, password strength, date range checks). No schema validation library.
**Authentication:** Dual-token model — HTTP-only cookie (`stock-insight-token`) is the primary mechanism; Bearer token in `Authorization` header is also accepted as fallback. Both are checked by `authenticateToken` middleware.

---

*Architecture analysis: 2026-05-19*
