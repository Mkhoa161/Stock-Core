# External Integrations

**Analysis Date:** 2026-05-19

## APIs & External Services

**Market Data:**
- Yahoo Finance (via `yahoo-finance2` npm package) - Real-time stock quotes, historical OHLCV data, company profiles
  - SDK/Client: `yahoo-finance2` 2.13.3
  - Auth: No API key required; rate-limited (HTTP 429); handled with exponential backoff in `backend/src/services/yahooFinanceService.ts`
  - Methods used: `quote()`, `historical()`, `quoteSummary()` with `assetProfile` + `price` modules
  - Rate limiting: 1500ms base delay between requests, 3 retries with exponential backoff

**Web Scraping:**
- Wikipedia S&P 500 list — Scraped to discover and seed company tickers
  - URL: `https://en.wikipedia.org/wiki/List_of_S%26P_500_companies`
  - Client: `axios` for HTTP fetch + `cheerio` for HTML parsing
  - Implementation: `backend/src/scripts/scrapeSP500.ts`
  - User-Agent: `StockInsight/1.0 (personal project; khoango)`

**Authentication:**
- Google OAuth 2.0 — Social login
  - SDK/Client: `passport-google-oauth20` 2.0.0
  - Auth env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - Callback endpoint: `GET /api/auth/google/callback`
  - OAuth URL built manually in `backend/src/routes/authRoutes.ts` (not delegated to passport redirect helper)
  - Scopes: `profile email`
  - Flow: OAuth code → user lookup/creation in PostgreSQL → JWT issued → HTTP-only cookie set → redirect to `FRONTEND_URL/auth/success`

## Data Storage

**Databases:**
- PostgreSQL 14
  - Development: Docker container (`backend/docker-compose.yml`), exposed on `localhost:5433`, database `stock_insight`
  - Production: AWS RDS instance
  - Connection env vars: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
  - Client: `pg` (node-postgres) — raw SQL, no ORM (`backend/src/config/database.ts`)
  - Connection: Single `Client` instance (not a pool); initialized at module load and kept open
  - Schema managed in-process via `CREATE TABLE IF NOT EXISTS` in `backend/src/config/database.ts`

**Schema (tables created automatically on startup):**
- `users` — id, email, password (bcrypt), username, first_name, last_name, avatar, google_id, created_at, updated_at
- `companies` — id, ticker, name, sector, industry, created_at, updated_at
- `stock_prices` — id, company_id (FK), date, open_price, high_price, low_price, close_price, volume, market_cap, created_at (UNIQUE on company_id+date)
- `daily_summaries` — id, company_id (FK), date, price, day_change, day_change_percent, market_cap, volume, created_at (UNIQUE on company_id+date)

**Indexes:**
- `idx_companies_ticker` on `companies(ticker)`
- `idx_stock_prices_company_date` on `stock_prices(company_id, date)`
- `idx_daily_summaries_company_date` on `daily_summaries(company_id, date)`
- `idx_stock_prices_date` on `stock_prices(date)`
- `idx_daily_summaries_date` on `daily_summaries(date)`

**File Storage:**
- Not applicable — frontend is static export deployed to S3; no user file uploads

**Caching:**
- Frontend: TanStack React Query in-memory cache (no TTL configuration detected)
- Backend: None — no Redis or server-side cache layer

## Authentication & Identity

**Auth Provider:**
- Custom (local credentials) + Google OAuth 2.0
  - Implementation: `backend/src/config/passport.ts`
  - Local strategy: Email + bcrypt password check via `passport-local`
  - Google strategy: `passport-google-oauth20`, upserts user records in PostgreSQL
  - JWT strategy: `passport-jwt`, reads token from `Authorization: Bearer` header OR `stock-insight-token` HTTP-only cookie
  - Token storage: HTTP-only cookie (`stock-insight-token`), 24h expiry, `sameSite: strict`, `secure` in production
  - JWT secret env var: `JWT_SECRET`
  - Token also returned in response body for Bearer usage

**Frontend Auth:**
- Cookies-only approach in `frontend/src/lib/api.ts` — all requests use `credentials: "include"`, no Authorization header sent from frontend

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or similar integration detected

**Logs:**
- `console.log` / `console.error` throughout all backend services and Lambda handler
- No structured logging library (no Winston, Pino, etc.)

**Health Check:**
- `GET /api/health` — returns `{ status: "OK", environment }` (`backend/src/app.ts`)
- Docker `HEALTHCHECK` pings `http://localhost:3000/api/health` every 30s (`backend/Dockerfile`)
- Yahoo Finance health check method available in `YahooFinanceService.healthCheck()` (fetches AAPL quote)

## CI/CD & Deployment

**Hosting:**
- Backend: AWS EC2 via Docker (`backend/docker-compose.prod.yml.template`)
- Frontend: AWS S3 (static export) + AWS CloudFront (CDN)
- Database: AWS RDS PostgreSQL
- Lambda: AWS Lambda for scheduled daily data collection

**CI Pipeline:**
- Not detected — no `.github/workflows/`, CircleCI, or similar configuration found

**Lambda Scheduling:**
- `backend/src/lambda/dailyDataCollector.ts` exports `handler` conforming to `APIGatewayProxyEvent`
- Detects `event.source === 'aws.events'` or `event['detail-type'] === 'Scheduled Event'` to identify EventBridge scheduled triggers
- Executes: S&P 500 scrape → company profile/market data update → historical data collection → old data cleanup

## Environment Configuration

**Required env vars (Backend production):**
- `JWT_SECRET` — JWT signing secret (throws on startup if missing in production)
- `FRONTEND_URL` — Allowed CORS origin and OAuth redirect target (throws on startup if missing in production)
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` — PostgreSQL connection
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — Google OAuth credentials
- `BASE_URL` — Backend public URL
- `PORT` — Listening port (defaults to 3000)
- `NODE_ENV` — Controls production validation, secure cookies, etc.

**Required env vars (Frontend production):**
- `NEXT_PUBLIC_API_BASE_URL` — Backend API base URL (throws at module load if missing in production)

**Secrets location:**
- Development: `.env` file in `backend/` (not committed)
- Production template: `backend/env.production.template` (committed, values redacted)
- Production secrets: `.env.production` in `backend/` (not committed, loaded via `env_file` in Docker Compose)

## Webhooks & Callbacks

**Incoming:**
- `GET /api/auth/google/callback` — Google OAuth 2.0 redirect callback after user consent (`backend/src/routes/authRoutes.ts`)

**Outgoing:**
- None detected — no webhook dispatch to external services

## API Collections

**Bruno (API testing):**
- `bruno-stock-insight-api/` — Bruno API collection for manual testing of backend endpoints
- Environments configured in `bruno-stock-insight-api/environments/`

---

*Integration audit: 2026-05-19*
