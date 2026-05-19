# Codebase Structure

**Analysis Date:** 2026-05-19

## Directory Layout

```
Stock-Core/                          # Monorepo root
├── backend/                         # Express API server
│   ├── src/
│   │   ├── app.ts                   # Express app factory (middleware + routes)
│   │   ├── server.ts                # HTTP server entry point
│   │   ├── config/
│   │   │   ├── config.ts            # Centralized env var config object
│   │   │   ├── database.ts          # pg.Client singleton + schema creation
│   │   │   └── passport.ts          # Passport strategies (Local, JWT, Google)
│   │   ├── lambda/
│   │   │   └── dailyDataCollector.ts # AWS Lambda handler + DailyDataCollector class
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.ts    # JWT/cookie token extraction + Passport auth
│   │   │   └── errorHandler.ts     # Global Express error handler
│   │   ├── models/
│   │   │   ├── company.ts           # TypeScript interfaces: Company, StockPrice, DailySummary
│   │   │   └── user.ts              # TypeScript interfaces: User, CreateUserInput
│   │   ├── routes/
│   │   │   ├── authRoutes.ts        # /api/auth/* endpoints
│   │   │   └── companyRoutes.ts     # /api/companies/* endpoints
│   │   ├── scripts/
│   │   │   ├── scrapeSP500.ts       # One-off: scrape Wikipedia, seed DB
│   │   │   ├── testLambda.ts        # Local Lambda invocation test
│   │   │   └── testLambdaSimple.ts  # Simplified Lambda test
│   │   ├── services/
│   │   │   ├── authService.ts       # JWT generation/verification, login/register
│   │   │   ├── companyService.ts    # Raw SQL CRUD for companies, stock_prices, daily_summaries
│   │   │   ├── historicalDataService.ts # DB-first cache layer for historical OHLCV data
│   │   │   ├── userService.ts       # User CRUD, password hashing, Google ID lookup
│   │   │   └── yahooFinanceService.ts   # Yahoo Finance API wrapper with retry logic
│   │   ├── tests/
│   │   │   ├── database.test.ts     # Database integration tests
│   │   │   └── setup.ts             # Test setup/teardown
│   │   └── utils/
│   │       └── authUtils.ts         # Token extraction, email/password validation, sanitizeUser
│   ├── Dockerfile                   # Docker image for backend
│   ├── docker-compose.yml           # Local dev compose (backend + postgres)
│   ├── docker-compose.prod.yml.template # Production compose template
│   ├── env.production.template      # Production env var template
│   ├── jest.config.js               # Jest test runner config
│   ├── package.json                 # Backend dependencies
│   └── tsconfig.json                # TypeScript config (target: ES2020, module: commonjs)
│
├── frontend/                        # Next.js 15 app (static export)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Root layout with QueryProvider + Navigation
│   │   │   ├── page.tsx             # Welcome/home page
│   │   │   ├── companies/
│   │   │   │   └── page.tsx         # /companies — company list page
│   │   │   └── company/
│   │   │       └── [ticker]/
│   │   │           └── page.tsx     # /company/:ticker — company detail (generateStaticParams)
│   │   ├── components/
│   │   │   ├── AuthGuard.tsx        # Auth-gating wrapper component
│   │   │   ├── CompaniesTable.tsx   # Company list with search filter
│   │   │   ├── CompanyDetail.tsx    # Candlestick chart (ECharts) + OHLCV table
│   │   │   └── Navigation.tsx       # Top nav bar
│   │   ├── contexts.ts              # AuthContext definition
│   │   ├── lib/
│   │   │   ├── api.ts               # fetch wrapper: get, post, put, del (cookies: include)
│   │   │   ├── hooks.ts             # React Query hooks: useCompanies, useCompany, useHistoricalData, useAuth
│   │   │   ├── queries.ts           # useAccountQuery (currently unused in main UI)
│   │   │   └── utils.ts             # formatCurrency, formatMarketCap, formatVolume, formatDate
│   │   ├── providers/
│   │   │   ├── AuthProvider.tsx     # Auth state (localStorage flag + React context)
│   │   │   ├── index.ts             # Re-exports QueryProvider
│   │   │   └── QueryProvider.tsx    # TanStack QueryClient + AuthProvider wrapper
│   │   └── types/
│   │       └── company.ts           # Frontend Company interface (mirrors backend model)
│   ├── next.config.ts               # Next.js config (output: 'export', static generation)
│   ├── package.json                 # Frontend dependencies
│   └── tsconfig.json                # TypeScript config (paths alias: @/* → src/*)
│
├── bruno-stock-insight-api/         # Bruno API test collection
│   ├── environments/                # Environment configs (local, prod URLs)
│   ├── *.bru                        # Individual API test request files
│   └── bruno.json                   # Bruno collection config
│
├── .planning/
│   └── codebase/                    # GSD codebase map documents
│
├── .claude/                         # Claude agent configuration
│   ├── agents/                      # Agent definitions
│   └── commands/gsd/                # GSD slash commands
│
└── README.md                        # Project overview
```

## Directory Purposes

**`backend/src/config/`:**
- Purpose: Application configuration and infrastructure setup
- Contains: Centralized env config (`config.ts`), database singleton (`database.ts`), Passport strategy registration (`passport.ts`)
- Key files: `database.ts` runs `initializeDatabase()` at import time — importing this module connects to PostgreSQL and creates all tables

**`backend/src/models/`:**
- Purpose: TypeScript interface definitions only — no classes, no ORM entities
- Contains: Data shapes for DB rows (`Company`, `StockPrice`, `DailySummary`, `User`) and input types for create operations
- Key files: `company.ts`, `user.ts`

**`backend/src/services/`:**
- Purpose: Business logic and data access — all database queries live here
- Contains: Stateless service classes, each exported as a singleton instance
- Key files: `companyService.ts` (core DB CRUD), `historicalDataService.ts` (cache layer), `yahooFinanceService.ts` (external API)

**`backend/src/routes/`:**
- Purpose: HTTP endpoint definitions, request validation, response formatting
- Contains: Express Router instances with inline validation
- Key files: `authRoutes.ts` (auth endpoints), `companyRoutes.ts` (stock data endpoints)

**`backend/src/lambda/`:**
- Purpose: AWS Lambda handler for scheduled data collection
- Contains: `dailyDataCollector.ts` — both the exported `handler` function and the `DailyDataCollector` class
- Key files: `dailyDataCollector.ts`

**`backend/src/scripts/`:**
- Purpose: One-off administrative scripts run locally
- Contains: Wikipedia scraper, Lambda test runners
- Key files: `scrapeSP500.ts`

**`backend/src/tests/`:**
- Purpose: Jest integration tests
- Contains: Database tests, setup/teardown
- Key files: `database.test.ts`, `setup.ts`

**`frontend/src/app/`:**
- Purpose: Next.js App Router pages — file-based routing
- Contains: `page.tsx` files per route, `layout.tsx` for root layout
- Key files: `company/[ticker]/page.tsx` (has `generateStaticParams` for static export)

**`frontend/src/components/`:**
- Purpose: Reusable React components — all are client components (`"use client"`)
- Contains: `CompaniesTable.tsx`, `CompanyDetail.tsx`, `Navigation.tsx`, `AuthGuard.tsx`
- Key files: `CompanyDetail.tsx` (uses ECharts for candlestick rendering)

**`frontend/src/lib/`:**
- Purpose: Shared utilities, API client, React Query hooks
- Contains: `api.ts` (fetch wrapper), `hooks.ts` (all React Query hooks), `utils.ts` (formatting)
- Key files: `hooks.ts` — the single source of truth for data fetching hooks

**`frontend/src/providers/`:**
- Purpose: React context providers for global state
- Contains: `QueryProvider.tsx` (TanStack), `AuthProvider.tsx` (auth state)
- Key files: `QueryProvider.tsx` wraps the entire app; `index.ts` re-exports it

**`frontend/src/types/`:**
- Purpose: Frontend TypeScript type definitions
- Contains: `company.ts` — `Company` interface matching the API response shape

**`bruno-stock-insight-api/`:**
- Purpose: API integration test collection using Bruno (open-source Postman alternative)
- Contains: Numbered `.bru` request files covering auth and company endpoints
- Not committed to CI — used for manual API testing

## Key File Locations

**Entry Points:**
- `backend/src/server.ts`: Backend HTTP server start
- `backend/src/lambda/dailyDataCollector.ts`: AWS Lambda handler (`export const handler`)
- `frontend/src/app/layout.tsx`: Next.js root layout

**Configuration:**
- `backend/src/config/config.ts`: All backend environment variables
- `backend/src/config/database.ts`: PostgreSQL connection and schema
- `frontend/next.config.ts`: Next.js build configuration (static export)
- `frontend/src/app/layout.tsx`: Provider tree setup

**Core Business Logic:**
- `backend/src/services/historicalDataService.ts`: DB-first cache logic
- `backend/src/services/yahooFinanceService.ts`: External data source
- `backend/src/services/companyService.ts`: Primary data persistence layer

**Data Fetching (Frontend):**
- `frontend/src/lib/hooks.ts`: All React Query hooks
- `frontend/src/lib/api.ts`: HTTP client (all requests go through here)

**Testing:**
- `backend/src/tests/database.test.ts`: Backend integration tests
- `backend/jest.config.js`: Jest configuration
- `bruno-stock-insight-api/`: Manual API test collection

## Naming Conventions

**Files (Backend):**
- Services: `camelCase` + `Service` suffix — `companyService.ts`, `authService.ts`
- Routes: `camelCase` + `Routes` suffix — `authRoutes.ts`, `companyRoutes.ts`
- Middleware: `camelCase` descriptive — `authMiddleware.ts`, `errorHandler.ts`
- Models: singular noun — `company.ts`, `user.ts`
- Config: descriptive noun — `config.ts`, `database.ts`, `passport.ts`

**Files (Frontend):**
- Pages: `page.tsx` (Next.js convention)
- Components: `PascalCase` — `CompaniesTable.tsx`, `CompanyDetail.tsx`
- Providers: `PascalCase` + `Provider` suffix — `AuthProvider.tsx`, `QueryProvider.tsx`
- Hooks: `camelCase` starting with `use` — `useCompanies`, `useCompany`, `useHistoricalData`
- Utils/lib: `camelCase` — `api.ts`, `hooks.ts`, `utils.ts`

**Directories:**
- Backend: lowercase — `config/`, `routes/`, `services/`, `models/`, `middlewares/`, `lambda/`, `scripts/`, `tests/`, `utils/`
- Frontend: lowercase — `app/`, `components/`, `lib/`, `providers/`, `types/`

**Exported class instances (Backend):**
- Pattern: `export const companyService = new CompanyService()` at end of each service file
- All services follow this singleton export pattern

## Where to Add New Code

**New API Endpoint:**
- Route handler: `backend/src/routes/` — create or extend existing `*Routes.ts` file
- Register route in: `backend/src/app.ts`
- Business logic: `backend/src/services/` — create `newFeatureService.ts`
- Types: `backend/src/models/` — add interfaces to appropriate model file or new file

**New Database Table:**
- Add `CREATE TABLE IF NOT EXISTS` to `backend/src/config/database.ts` in the `createTables()` function
- Add TypeScript interfaces to `backend/src/models/`
- Add query methods to appropriate service in `backend/src/services/`

**New Frontend Page:**
- Page component: `frontend/src/app/<route>/page.tsx`
- If dynamic route: add `generateStaticParams()` export for static export compatibility
- If client-side data needed: add hook to `frontend/src/lib/hooks.ts`

**New Frontend Component:**
- Implementation: `frontend/src/components/FeatureName.tsx`
- Add `"use client"` directive if component uses hooks or browser APIs
- Use hooks from `frontend/src/lib/hooks.ts` for data fetching

**New React Query Hook:**
- Add to: `frontend/src/lib/hooks.ts`
- Follow pattern: `useQuery({ queryKey: [...], queryFn: () => api.get(...), staleTime: 5 * 60 * 1000 })`

**Utilities:**
- Backend shared helpers: `backend/src/utils/` (e.g., `authUtils.ts`)
- Frontend formatting/helpers: `frontend/src/lib/utils.ts`

**New Environment Variable:**
- Backend: add to `backend/src/config/config.ts` `Config` interface and config object
- Frontend: prefix with `NEXT_PUBLIC_` for client-side access; reference in `frontend/src/lib/api.ts` if URL-related

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents consumed by planning and execution agents
- Generated: Yes (by `/gsd:map-codebase`)
- Committed: Yes

**`.claude/`:**
- Purpose: Claude agent configuration, GSD workflow commands and agent definitions
- Generated: No
- Committed: Yes

**`bruno-stock-insight-api/`:**
- Purpose: Manual API test collection (Bruno tool)
- Generated: No
- Committed: Yes

**`backend/node_modules/`, `frontend/node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in `.gitignore`)

**`frontend/.next/`:**
- Purpose: Next.js build artifacts and cache
- Generated: Yes (by `npm run build`)
- Committed: No

---

*Structure analysis: 2026-05-19*
