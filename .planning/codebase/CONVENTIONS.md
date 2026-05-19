# Coding Conventions

**Analysis Date:** 2026-05-19

## Naming Patterns

**Files:**
- Backend TypeScript source files use camelCase: `companyService.ts`, `authMiddleware.ts`, `errorHandler.ts`
- Frontend React components use PascalCase: `CompaniesTable.tsx`, `CompanyDetail.tsx`, `Navigation.tsx`
- Frontend lib/util files use camelCase: `api.ts`, `hooks.ts`, `utils.ts`, `queries.ts`
- Route files use camelCase: `companyRoutes.ts`, `authRoutes.ts`
- Model files use camelCase, named after domain entity: `company.ts`, `user.ts`

**Classes:**
- PascalCase for class declarations: `CompanyService`, `AuthService`, `YahooFinanceService`, `HistoricalDataService`
- Singleton instances exported as camelCase const below the class: `export const companyService = new CompanyService();`

**Functions:**
- camelCase for all functions and methods: `getAllCompanies()`, `getCompanyByTicker()`, `formatCurrency()`, `extractTokenFromHeader()`
- Async methods always use `async/await` pattern, not `.then()` chains (except in legacy middleware fallback code in `authMiddleware.ts`)
- Private class methods prefixed with `private` keyword: `private async withRetry()`, `private delay()`

**Variables and Parameters:**
- camelCase for local variables and function parameters: `companyId`, `stockPriceData`, `bearerToken`
- Database column names in SQL use snake_case: `company_id`, `open_price`, `day_change_percent`
- Interface properties mirror database schema naming for model types: `open_price`, `high_price`, `created_at`

**Types and Interfaces:**
- PascalCase for all interface and type names: `Company`, `StockPrice`, `DailySummary`, `CreateCompanyInput`
- Input/DTO types suffixed with `Input`: `CreateCompanyInput`, `CreateStockPriceInput`, `CreateUserInput`
- Response/result types suffixed with `Response` or `Result`: `HistoricalDataResponse`, `DailyCollectionResult`
- "With" pattern for extended types: `CompanyWithLatestData extends Company`

## Code Style

**Formatting (Backend):**
- Tool: Prettier (`backend/.prettierrc`)
- `semi: true` — semicolons required
- `singleQuote: true` — single quotes for strings
- `trailingComma: "all"` — trailing commas everywhere

**Formatting (Frontend):**
- No explicit Prettier config found; follows Next.js/ESLint defaults
- Double quotes for JSX attributes (React convention)
- Single-line ternary expressions for simple JSX conditionals

**Linting:**
- Backend: ESLint v9 (`eslint` devDependency), config file not located but `lint` script runs `eslint 'src/**/*.ts'`
- Frontend: ESLint v9 with `eslint-config-next` extending `next/core-web-vitals` and `next/typescript` (`frontend/eslint.config.mjs`)

**TypeScript:**
- Backend: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` (`backend/tsconfig.json`)
- Several stricter options commented out (`noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`)
- `any` is used in some places despite strict mode, particularly for error types: `catch (error: any)` and middleware `user: any`

## Import Organization

**Backend Order (observed):**
1. Third-party packages: `import jwt from 'jsonwebtoken'`, `import { Router } from 'express'`
2. Internal config: `import config from '../config/config'`
3. Internal services/models: `import { companyService } from '../services/companyService'`

**Frontend Order (observed):**
1. React and framework imports: `import { useState, useMemo } from "react"`
2. Next.js imports: `import Link from "next/link"`
3. Internal lib/utils: `import { formatCurrency } from "@/lib/utils"`
4. Internal hooks: `import { useCompanies } from "@/lib/hooks"`
5. Internal types: `import { Company } from "@/types/company"`

**Path Aliases:**
- Frontend uses `@/` alias mapping to `src/`: `import api from "@/lib/api"`, `import { Company } from "@/types/company"`
- Backend uses relative paths only, no aliases

## Error Handling

**Backend Services:**
- Async service methods use `try/catch` internally and re-throw errors with `throw error`
- Errors are logged with `console.error()` before re-throwing
- Pattern: log with emoji prefix then throw: `console.error('❌ Error...', error); throw error;`
- Some methods return error objects rather than throwing: `HistoricalDataResponse` includes `success: boolean` and `error?: string`

**Backend Routes:**
- Routes catch errors and return JSON error responses:
  ```typescript
  try {
    // ...
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
  }
  ```
- Input validation returns 400 before service calls
- Not-found conditions return 404: `res.status(404).json({ message: 'Company not found' })`
- Global error handler in `backend/src/middlewares/errorHandler.ts` handles `AppError` with optional `status` property

**Frontend:**
- API errors handled through custom `ApiError` class in `frontend/src/lib/api.ts` extending `Error` with `status` and `code`
- React Query hooks propagate errors to `error` property; components render error UI inline
- Error state check pattern in components: `if (error) { return <div>Error: {error.message}</div> }`

## Logging

**Framework:** `console.*` — no structured logging library

**Patterns:**
- Emoji prefixes used consistently throughout backend to signal log level/status:
  - `✅` — success
  - `❌` — error
  - `⚠️` — warning
  - `🔍` — debug/investigation
  - `🔄` — in-progress operation
  - `📈` — data fetch
  - `🏗️` — setup/initialization
  - `🧪` / `🧹` — test setup/teardown
- `console.log()` for operational status: `console.log('✅ Updated market data for company ${companyId}')`
- `console.error()` for errors: `console.error('❌ Error updating...', error)`
- `console.warn()` for rate-limit retry warnings in `yahooFinanceService.ts`
- 168 `console.*` calls across backend source; no log levels or structured output

## Comments

**When to Comment:**
- JSDoc `/** ... */` block comments on public service methods describing behavior: `/** Get historical data for a company with lazy loading */`
- Inline comments for non-obvious logic: `// Remove extra quotes if present`
- Step-by-step numbered comments for multi-phase operations in service methods
- `// TODO` and `// FIXME` — none found in current codebase

**JSDoc Usage:**
- Used on key service methods in `companyService.ts`, `historicalDataService.ts`, `yahooFinanceService.ts`
- Not used on utility functions or route handlers

## Function Design

**Size:** Service methods range from 5 to 50+ lines; longer methods handle multi-step database/API orchestration

**Parameters:**
- Simple scalar parameters for most methods: `getCompanyByTicker(ticker: string)`
- Object parameters for input data: `createCompany(companyData: CreateCompanyInput)`
- Inline object types for ad-hoc data: `updateCompanyMarketData(companyId: number, marketData: { price: number; change: number; ... })`

**Return Values:**
- Service methods return typed objects or `null` for not-found: `Promise<Company | null>`
- Some service methods return `void` for side-effect-only operations
- API-facing operations return result objects with `success: boolean` pattern

## Module Design

**Backend Exports:**
- Classes exported by name: `export class CompanyService { ... }`
- Singleton instances exported as named const: `export const companyService = new CompanyService();`
- Route modules use `export default router`
- Config/infrastructure modules use `export default` for the singleton: `export default client`, `export default config`
- Interfaces and types always use named exports

**Frontend Exports:**
- React components use named exports from component files: `export function CompaniesTable() { ... }`
- Providers use default exports: `export default function QueryProviders(...)`
- Utility functions use named exports: `export const formatCurrency = (...) => ...`
- `frontend/src/providers/index.ts` re-exports providers as barrel file

**Barrel Files:**
- `frontend/src/providers/index.ts` — barrel for providers
- No barrel files in backend; each module imported from its specific path

---

*Convention analysis: 2026-05-19*
