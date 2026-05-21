<!-- GSD:project-start source:PROJECT.md -->
## Project

**Stock-Core**

A public read-only S&P 500 stock tracker that collects daily market data for all 500 companies via Yahoo Finance and serves it as a statically-exported Next.js site on S3. Users can browse the company list, view live price data, and inspect historical price charts — no login required.

**Core Value:** Every S&P 500 ticker shows accurate market data and a working historical price chart.

### Constraints

- **Data source**: Yahoo Finance via `yahoo-finance2` only — no paid APIs
- **Deployment**: Static export to S3 — no server-side rendering, no Node.js server in production frontend
- **Lambda timeout**: 15 minutes hard limit — data collection must complete within this window for all 500 tickers
- **Stack**: Keep existing Next.js + Express + PostgreSQL + AWS Lambda stack — no re-architecture
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - All backend source (`backend/src/`) and frontend source (`frontend/src/`)
- JavaScript - Configuration files only (`backend/jest.config.js`)
## Runtime
- Node.js 18 (Docker base image: `node:18-alpine`; local environment runs v25.x)
- npm (both workspaces)
- Lockfile: `backend/package-lock.json` and `frontend/package-lock.json` both present
## Frameworks
- Express 5.1.0 - HTTP server and routing (`backend/src/app.ts`, `backend/src/server.ts`)
- Next.js 15.4.1 - React framework, configured for static export (`frontend/next.config.ts`)
- React 19.1.0 - UI library (`frontend/src/`)
- TailwindCSS 4.x - Utility-first CSS via PostCSS (`frontend/postcss.config.mjs`)
- TanStack React Query 5.x - Server state management and caching (`frontend/src/lib/hooks.ts`)
- Chart.js 4.5.0 + react-chartjs-2 5.x - Chart rendering (`frontend/src/components/`)
- echarts 5.6.0 - Additional chart library (`frontend/src/components/`)
- chartjs-adapter-date-fns 3.x - Date adapter for Chart.js time scales
- chartjs-chart-financial 0.2.1 - Candlestick/OHLC chart support
- Jest 29.7.0 - Test runner (`backend/jest.config.js`)
- ts-jest 29.1.2 - TypeScript transform for Jest
- Timeout: 60 seconds per test
- ts-node 10.9.2 - Direct TypeScript execution for scripts and dev server
- nodemon 3.1.10 - File watching for dev server (`npm run dev`)
- TypeScript compiler (`tsc`) - Production builds to `backend/dist/`
## Key Dependencies
- `pg` 8.x - PostgreSQL client (no ORM; raw SQL queries) (`backend/src/config/database.ts`)
- `yahoo-finance2` 2.13.3 - Market data source (`backend/src/services/yahooFinanceService.ts`)
- `cheerio` 1.1.0 - HTML parsing for Wikipedia S&P 500 scraping (`backend/src/scripts/scrapeSP500.ts`)
- `axios` 1.11.0 - HTTP client for web scraping requests
- `dotenv` 17.x - Environment variable loading
- `cors` 2.8.5 - Cross-origin resource sharing with frontend origin allowlist
- Native `fetch` API - All API calls via `frontend/src/lib/api.ts`
- `@tanstack/react-query` 5.x - Query caching and state synchronization
- `@types/aws-lambda` 8.10.152 - Type definitions for Lambda handler in `backend/src/lambda/dailyDataCollector.ts`
## Configuration
- Loaded via `dotenv` in `backend/src/config/config.ts`
- Required production variables: `FRONTEND_URL`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- Template available: `backend/env.production.template`
- Development defaults fall back to `localhost` values; production throws on missing critical vars
- `NEXT_PUBLIC_API_BASE_URL` - Required in production; falls back to `http://localhost:3000` in development
- Throws at module load time if missing in production (`frontend/src/lib/api.ts`)
- Backend TypeScript: `backend/tsconfig.json` — strict mode, `nodenext` module resolution, target `esnext`, outputs to `backend/dist/`
- Frontend TypeScript: `frontend/tsconfig.json` — strict mode, `bundler` module resolution, `@/*` path alias for `frontend/src/*`
- Frontend Next.js: `frontend/next.config.ts` — static export mode (`output: 'export'`), images unoptimized, trailing slashes enabled
## Platform Requirements
- Node.js 18+ (Docker) or current LTS
- PostgreSQL 14 (via Docker: `backend/docker-compose.yml` exposes on port 5433)
- Docker + Docker Compose for local database
- Backend: Docker container on AWS EC2, port 3000 (`backend/docker-compose.prod.yml.template`)
- Frontend: Static export deployed to AWS S3 + CloudFront
- Database: AWS RDS PostgreSQL 14
- Lambda: AWS Lambda function for daily data collection (`backend/src/lambda/dailyDataCollector.ts`)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Backend TypeScript source files use camelCase: `companyService.ts`, `authMiddleware.ts`, `errorHandler.ts`
- Frontend React components use PascalCase: `CompaniesTable.tsx`, `CompanyDetail.tsx`, `Navigation.tsx`
- Frontend lib/util files use camelCase: `api.ts`, `hooks.ts`, `utils.ts`
- Route files use camelCase: `companyRoutes.ts`, `authRoutes.ts`
- Model files use camelCase, named after domain entity: `company.ts`, `user.ts`
- PascalCase for class declarations: `CompanyService`, `AuthService`, `YahooFinanceService`, `HistoricalDataService`
- Singleton instances exported as camelCase const below the class: `export const companyService = new CompanyService();`
- camelCase for all functions and methods: `getAllCompanies()`, `getCompanyByTicker()`, `formatCurrency()`, `extractTokenFromHeader()`
- Async methods always use `async/await` pattern, not `.then()` chains (except in legacy middleware fallback code in `authMiddleware.ts`)
- Private class methods prefixed with `private` keyword: `private async withRetry()`, `private delay()`
- camelCase for local variables and function parameters: `companyId`, `stockPriceData`, `bearerToken`
- Database column names in SQL use snake_case: `company_id`, `open_price`, `day_change_percent`
- Interface properties mirror database schema naming for model types: `open_price`, `high_price`, `created_at`
- PascalCase for all interface and type names: `Company`, `StockPrice`, `DailySummary`, `CreateCompanyInput`
- Input/DTO types suffixed with `Input`: `CreateCompanyInput`, `CreateStockPriceInput`, `CreateUserInput`
- Response/result types suffixed with `Response` or `Result`: `HistoricalDataResponse`, `DailyCollectionResult`
- "With" pattern for extended types: `CompanyWithLatestData extends Company`
## Code Style
- Tool: Prettier (`backend/.prettierrc`)
- `semi: true` — semicolons required
- `singleQuote: true` — single quotes for strings
- `trailingComma: "all"` — trailing commas everywhere
- No explicit Prettier config found; follows Next.js/ESLint defaults
- Double quotes for JSX attributes (React convention)
- Single-line ternary expressions for simple JSX conditionals
- Backend: ESLint v9 (`eslint` devDependency), config file not located but `lint` script runs `eslint 'src/**/*.ts'`
- Frontend: ESLint v9 with `eslint-config-next` extending `next/core-web-vitals` and `next/typescript` (`frontend/eslint.config.mjs`)
- Backend: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` (`backend/tsconfig.json`)
- Several stricter options commented out (`noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`)
- `any` is used in some places despite strict mode, particularly for error types: `catch (error: any)` and middleware `user: any`
## Import Organization
- Frontend uses `@/` alias mapping to `src/`: `import api from "@/lib/api"`, `import { Company } from "@/types/company"`
- Backend uses relative paths only, no aliases
## Error Handling
- Async service methods use `try/catch` internally and re-throw errors with `throw error`
- Errors are logged with `console.error()` before re-throwing
- Pattern: log with emoji prefix then throw: `console.error('❌ Error...', error); throw error;`
- Some methods return error objects rather than throwing: `HistoricalDataResponse` includes `success: boolean` and `error?: string`
- Routes catch errors and return JSON error responses:
- Input validation returns 400 before service calls
- Not-found conditions return 404: `res.status(404).json({ message: 'Company not found' })`
- Global error handler in `backend/src/middlewares/errorHandler.ts` handles `AppError` with optional `status` property
- API errors handled through custom `ApiError` class in `frontend/src/lib/api.ts` extending `Error` with `status` and `code`
- React Query hooks propagate errors to `error` property; components render error UI inline
- Error state check pattern in components: `if (error) { return <div>Error: {error.message}</div> }`
## Logging
- Emoji prefixes used consistently throughout backend to signal log level/status:
- `console.log()` for operational status: `console.log('✅ Updated market data for company ${companyId}')`
- `console.error()` for errors: `console.error('❌ Error updating...', error)`
- `console.warn()` for rate-limit retry warnings in `yahooFinanceService.ts`
- 168 `console.*` calls across backend source; no log levels or structured output
## Comments
- JSDoc `/** ... */` block comments on public service methods describing behavior: `/** Get historical data for a company with lazy loading */`
- Inline comments for non-obvious logic: `// Remove extra quotes if present`
- Step-by-step numbered comments for multi-phase operations in service methods
- `// TODO` and `// FIXME` — none found in current codebase
- Used on key service methods in `companyService.ts`, `historicalDataService.ts`, `yahooFinanceService.ts`
- Not used on utility functions or route handlers
## Function Design
- Simple scalar parameters for most methods: `getCompanyByTicker(ticker: string)`
- Object parameters for input data: `createCompany(companyData: CreateCompanyInput)`
- Inline object types for ad-hoc data: `updateCompanyMarketData(companyId: number, marketData: { price: number; change: number; ... })`
- Service methods return typed objects or `null` for not-found: `Promise<Company | null>`
- Some service methods return `void` for side-effect-only operations
- API-facing operations return result objects with `success: boolean` pattern
## Module Design
- Classes exported by name: `export class CompanyService { ... }`
- Singleton instances exported as named const: `export const companyService = new CompanyService();`
- Route modules use `export default router`
- Config/infrastructure modules use `export default` for the singleton: `export default client`, `export default config`
- Interfaces and types always use named exports
- React components use named exports from component files: `export function CompaniesTable() { ... }`
- Providers use default exports: `export default function QueryProviders(...)`
- Utility functions use named exports: `export const formatCurrency = (...) => ...`
- `frontend/src/providers/index.ts` re-exports providers as barrel file
- `frontend/src/providers/index.ts` — barrel for providers
- No barrel files in backend; each module imported from its specific path
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- No ORM — all database access uses raw PostgreSQL parameterized queries via `pg` Client
- Single PostgreSQL client instance created at module load time (`backend/src/config/database.ts`), shared across all services via `dbInterface` import
- Historical data uses a DB-first cache pattern: check database completeness, fall back to Yahoo Finance API, then write-through to DB
- Frontend auth state is tracked via a `localStorage` boolean flag (`__stock_insight_logged_in__`); the actual session token lives in an HTTP-only cookie
- Frontend is configured for static export (`next export`) with `generateStaticParams` on the `[ticker]` route
## Layers
- Purpose: HTTP request parsing, input validation, response serialization
- Location: `backend/src/routes/`
- Contains: `authRoutes.ts`, `companyRoutes.ts`
- Depends on: Services, middlewares, utils
- Used by: Express app (`backend/src/app.ts`)
- Purpose: Business logic — data fetching, caching, auth orchestration
- Location: `backend/src/services/`
- Contains: `companyService.ts`, `historicalDataService.ts`, `yahooFinanceService.ts`, `authService.ts`, `userService.ts`
- Depends on: Database config, external Yahoo Finance API, models
- Used by: Routes, Lambda
- Purpose: Raw SQL execution against PostgreSQL
- Location: `backend/src/config/database.ts`
- Contains: Single `pg.Client` instance, `initializeDatabase()`, `createTables()`
- Depends on: `config.ts` for connection string
- Used by: All services via `import dbInterface from '../config/database'`
- Purpose: TypeScript interfaces only — no ORM, no class instances
- Location: `backend/src/models/`
- Contains: `company.ts` (Company, StockPrice, DailySummary, input types), `user.ts` (User, CreateUserInput)
- Depends on: Nothing
- Used by: Services, routes
- Purpose: Scheduled daily data ingestion
- Location: `backend/src/lambda/`
- Contains: `dailyDataCollector.ts` — AWS Lambda handler + `DailyDataCollector` class
- Depends on: Services, scripts
- Used by: AWS EventBridge (24-hour schedule)
- Purpose: Route-level page components
- Location: `frontend/src/app/`
- Contains: `page.tsx` (welcome), `companies/page.tsx` (list), `company/[ticker]/page.tsx` (detail)
- Depends on: Components, providers
- Used by: Next.js router
- Purpose: Reusable UI pieces with data-fetching hooks
- Location: `frontend/src/components/`
- Contains: `CompaniesTable.tsx`, `CompanyDetail.tsx`, `Navigation.tsx`, `AuthGuard.tsx`
- Depends on: `lib/hooks.ts`, `lib/utils.ts`
- Used by: Pages
- Purpose: API communication and React Query integration
- Location: `frontend/src/lib/`
- Contains: `api.ts` (fetch wrapper), `hooks.ts` (React Query hooks), `utils.ts`
- Depends on: `NEXT_PUBLIC_API_BASE_URL` env var
- Used by: Components
## Data Flow
### Company List Request (Frontend to Database)
### Historical Data Request (Lazy Cache Pattern)
### Daily Data Collection (Lambda)
### Auth Flow
## Key Abstractions
- Purpose: Single PostgreSQL client shared across all services
- Examples: `backend/src/config/database.ts` (exported as `client`)
- Pattern: Module-level singleton — imported as `dbInterface` by all services. Tables are created on first connect via `initializeDatabase()` at module load time.
- Purpose: Stateless service classes exported as module-level instances
- Examples: `companyService`, `historicalDataService`, `yahooFinanceService`, `authService`, `userService` — each exported at bottom of their respective file
- Pattern: `export const companyService = new CompanyService()`
- Purpose: Typed async data fetching with caching
- Examples: `useCompanies`, `useCompany`, `useHistoricalData` in `frontend/src/lib/hooks.ts`
- Pattern: `useQuery({ queryKey, queryFn, staleTime: 5min, gcTime: 10min })`
- Purpose: Exponential backoff on Yahoo Finance rate limits (429 / Too Many Requests)
- Examples: `backend/src/services/yahooFinanceService.ts:39` (`withRetry`)
- Pattern: `MAX_RETRIES=3`, `BASE_DELAY_MS=1500ms`, doubles on each retry
## Entry Points
- Location: `backend/src/server.ts`
- Triggers: `node dist/server.js` or Docker entrypoint
- Responsibilities: Bind Express app to `config.port` (default 3000)
- Location: `backend/src/lambda/dailyDataCollector.ts` (`handler` export)
- Triggers: AWS EventBridge scheduled event (24h) or manual invocation
- Responsibilities: Full daily data collection pipeline
- Location: `frontend/src/app/layout.tsx`
- Triggers: Next.js dev server or static export build
- Responsibilities: Root layout with QueryProvider + AuthProvider, Navigation
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
### Auth state relies on localStorage boolean
### Inline SQL in service methods
## Error Handling
- Routes catch errors and return structured JSON: `{ message: string, error?: string }` with appropriate HTTP status codes
- Services log errors with `console.error` and re-throw or return empty/null results
- `YahooFinanceService` swallows per-symbol errors and continues processing remaining symbols
- Global handler: `backend/src/middlewares/errorHandler.ts` — logs error, responds with `err.status || 500`
- Lambda: catches all top-level errors and returns `500` response with error details
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
