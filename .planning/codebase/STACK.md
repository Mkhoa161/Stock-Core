# Technology Stack

**Analysis Date:** 2026-05-19

## Languages

**Primary:**
- TypeScript 5.x - All backend source (`backend/src/`) and frontend source (`frontend/src/`)

**Secondary:**
- JavaScript - Configuration files only (`backend/jest.config.js`)

## Runtime

**Environment:**
- Node.js 18 (Docker base image: `node:18-alpine`; local environment runs v25.x)

**Package Manager:**
- npm (both workspaces)
- Lockfile: `backend/package-lock.json` and `frontend/package-lock.json` both present

## Frameworks

**Backend:**
- Express 5.1.0 - HTTP server and routing (`backend/src/app.ts`, `backend/src/server.ts`)
- Passport 0.7.0 - Authentication middleware (`backend/src/config/passport.ts`)

**Frontend:**
- Next.js 15.4.1 - React framework, configured for static export (`frontend/next.config.ts`)
- React 19.1.0 - UI library (`frontend/src/`)
- TailwindCSS 4.x - Utility-first CSS via PostCSS (`frontend/postcss.config.mjs`)

**Data Fetching (Frontend):**
- TanStack React Query 5.x - Server state management and caching (`frontend/src/lib/hooks.ts`, `frontend/src/lib/queries.ts`)

**Charting:**
- Chart.js 4.5.0 + react-chartjs-2 5.x - Chart rendering (`frontend/src/components/`)
- echarts 5.6.0 - Additional chart library (`frontend/src/components/`)
- chartjs-adapter-date-fns 3.x - Date adapter for Chart.js time scales
- chartjs-chart-financial 0.2.1 - Candlestick/OHLC chart support

**Testing:**
- Jest 29.7.0 - Test runner (`backend/jest.config.js`)
- ts-jest 29.1.2 - TypeScript transform for Jest
- Timeout: 60 seconds per test

**Build/Dev:**
- ts-node 10.9.2 - Direct TypeScript execution for scripts and dev server
- nodemon 3.1.10 - File watching for dev server (`npm run dev`)
- TypeScript compiler (`tsc`) - Production builds to `backend/dist/`

## Key Dependencies

**Backend — Critical:**
- `pg` 8.x - PostgreSQL client (no ORM; raw SQL queries) (`backend/src/config/database.ts`)
- `yahoo-finance2` 2.13.3 - Market data source (`backend/src/services/yahooFinanceService.ts`)
- `jsonwebtoken` 9.0.2 - JWT generation and verification (`backend/src/services/authService.ts`)
- `bcryptjs` 2.4.3 - Password hashing (`backend/src/services/userService.ts`)
- `passport-google-oauth20` 2.0.0 - Google OAuth 2.0 strategy (`backend/src/config/passport.ts`)
- `passport-jwt` 4.0.1 - JWT extraction and validation strategy
- `passport-local` 1.0.0 - Email/password authentication strategy
- `cheerio` 1.1.0 - HTML parsing for Wikipedia S&P 500 scraping (`backend/src/scripts/scrapeSP500.ts`)
- `axios` 1.11.0 - HTTP client for web scraping requests
- `dotenv` 17.x - Environment variable loading

**Backend — Infrastructure:**
- `cors` 2.8.5 - Cross-origin resource sharing with frontend origin allowlist
- `cookie-parser` 1.4.7 - HTTP-only cookie parsing for JWT auth

**Frontend — Critical:**
- Native `fetch` API - All API calls via `frontend/src/lib/api.ts`
- `@tanstack/react-query` 5.x - Query caching and state synchronization

**AWS Lambda:**
- `@types/aws-lambda` 8.10.152 - Type definitions for Lambda handler in `backend/src/lambda/dailyDataCollector.ts`

## Configuration

**Backend Environment:**
- Loaded via `dotenv` in `backend/src/config/config.ts`
- Required production variables: `JWT_SECRET`, `FRONTEND_URL`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Template available: `backend/env.production.template`
- Development defaults fall back to `localhost` values; production throws on missing critical vars

**Frontend Environment:**
- `NEXT_PUBLIC_API_BASE_URL` - Required in production; falls back to `http://localhost:3000` in development
- Throws at module load time if missing in production (`frontend/src/lib/api.ts`)

**Build:**
- Backend TypeScript: `backend/tsconfig.json` — strict mode, `nodenext` module resolution, target `esnext`, outputs to `backend/dist/`
- Frontend TypeScript: `frontend/tsconfig.json` — strict mode, `bundler` module resolution, `@/*` path alias for `frontend/src/*`
- Frontend Next.js: `frontend/next.config.ts` — static export mode (`output: 'export'`), images unoptimized, trailing slashes enabled

## Platform Requirements

**Development:**
- Node.js 18+ (Docker) or current LTS
- PostgreSQL 14 (via Docker: `backend/docker-compose.yml` exposes on port 5433)
- Docker + Docker Compose for local database

**Production:**
- Backend: Docker container on AWS EC2, port 3000 (`backend/docker-compose.prod.yml.template`)
- Frontend: Static export deployed to AWS S3 + CloudFront
- Database: AWS RDS PostgreSQL 14
- Lambda: AWS Lambda function for daily data collection (`backend/src/lambda/dailyDataCollector.ts`)

---

*Stack analysis: 2026-05-19*
