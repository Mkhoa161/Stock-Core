# Testing Patterns

**Analysis Date:** 2026-05-19

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `backend/jest.config.js`
- TypeScript transformation via `ts-jest` 29.1.2

**Assertion Library:**
- Jest built-in (`expect`, `toBe`, `toBeDefined`, `toBeGreaterThan`, `toHaveProperty`, `rejects.toThrow`)

**Run Commands:**
```bash
npm test                              # Run all tests
npm run test:watch                    # Watch mode
npm run test:database                 # Run only database.test.ts
npm run test:comprehensive            # Run only comprehensive.test.ts (file not currently present)
```

Coverage (not wired to a CI command but configured):
```bash
npm test -- --coverage               # Run tests with coverage report
```

## Test File Organization

**Location:**
- Centralized in `backend/src/tests/` — not co-located with source files

**Naming:**
- `*.test.ts` suffix: `database.test.ts`

**Structure:**
```
backend/src/tests/
├── database.test.ts    # Integration tests against live PostgreSQL
└── setup.ts            # Global Jest setup file (setupFilesAfterEnv)
```

**Note:** No test files exist in the frontend (`frontend/`) — zero frontend test coverage.

## Test Structure

**Suite Organization:**
```typescript
describe('Database Operations Tests', () => {
  const testTicker = `T${Date.now().toString().slice(-8)}`; // unique per run

  beforeAll(async () => { /* setup */ });
  afterAll(async () => { /* teardown */ });

  describe('Company Service Tests', () => {
    test('should connect to PostgreSQL database', async () => { ... });
    test('should create and retrieve a company', async () => { ... });
    test('should handle duplicate ticker gracefully', async () => { ... });
  });

  describe('Stock Price Operations', () => { ... });
  describe('Daily Summary Operations', () => { ... });
});
```

**Patterns:**
- Nested `describe` blocks group related operations
- `beforeAll` / `afterAll` for setup and teardown at suite level
- `test()` (not `it()`) for individual assertions
- Tests are **stateful and sequential** — later tests depend on data created by earlier tests (e.g., stock price tests depend on company created earlier)

## Mocking

**Framework:** Jest built-in mocking (`clearMocks`, `resetMocks`, `restoreMocks` all enabled in `jest.config.js`)

**Current Mocking Usage:**
- No mocks are used in `database.test.ts` — all tests run against the **real PostgreSQL database**
- `setup.ts` stubs `console.log` optionally (commented-out by default):
  ```typescript
  beforeEach(() => {
    // console.log = jest.fn(); // Uncomment to suppress logs
  });
  afterEach(() => {
    console.log = originalLog;
  });
  ```

**What to Mock (recommended pattern for new tests):**
- External services (Yahoo Finance API) when writing unit tests for `historicalDataService.ts`
- Database client for unit-level service tests

**What NOT to Mock:**
- The PostgreSQL `pg` client when running integration tests in `database.test.ts`

## Fixtures and Factories

**Test Data:**
```typescript
// Dynamic ticker generation to avoid collisions
const testTicker = `T${Date.now().toString().slice(-8)}`; // e.g. "T12345678"

// Inline fixture objects per test
const testCompany = {
  ticker: testTicker,
  name: 'Test Database Company',
  sector: 'Technology',
  industry: 'Software Testing'
};

const stockPriceData = {
  company_id: company.id,
  date: new Date('2024-01-15'),
  open_price: 100.50,
  high_price: 105.25,
  low_price: 99.75,
  close_price: 103.00,
  volume: 1000000,
  market_cap: 1000000000
};
```

**Location:**
- No shared fixture or factory files; all test data is defined inline within test functions
- No cleanup of test data after runs — test records accumulate in the real database

## Coverage

**Requirements:** No coverage threshold enforced (no `coverageThreshold` in `jest.config.js`)

**Configured Coverage:**
```javascript
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/tests/**/*.ts',    // excludes test files themselves
  '!src/scripts/**/*.ts',  // excludes scripts
],
coverageDirectory: 'coverage',
coverageReporters: ['text', 'lcov', 'html'],
```

**View Coverage:**
```bash
npm test -- --coverage
# HTML report at: backend/coverage/index.html
```

**Actual coverage is low** — only `database.test.ts` exists, covering only `companyService.ts` indirectly. No tests for `authService.ts`, `userService.ts`, `historicalDataService.ts`, `yahooFinanceService.ts`, routes, or middlewares.

## Test Types

**Unit Tests:**
- None exist. No tests isolate individual functions with mocked dependencies.

**Integration Tests:**
- `backend/src/tests/database.test.ts` — tests `CompanyService` methods against a live PostgreSQL database
- Requires a running PostgreSQL instance and valid `.env` configuration to pass
- 60-second timeout per test (`jest.config.js: testTimeout: 60000`, overridden in `setup.ts: jest.setTimeout(60000)`)
- `forceExit: true` in config prevents Jest from hanging after tests due to open DB connections

**E2E Tests:**
- Not used in either frontend or backend

## Common Patterns

**Async Testing:**
```typescript
test('should create and retrieve a company', async () => {
  const created = await companyService.createCompany(testCompany);
  expect(created).toBeDefined();
  expect(created.ticker).toBe(testTicker);
});
```

**Error Testing:**
```typescript
test('should handle duplicate ticker gracefully', async () => {
  await expect(
    companyService.createCompany(duplicateCompany)
  ).rejects.toThrow();
});
```

**Numeric Assertion with DB type coercion:**
```typescript
// PostgreSQL DECIMAL returns strings; explicit conversion required
expect(parseFloat(created.close_price.toString())).toBe(103.00);
expect(parseFloat(created.day_change_percent.toString())).toBe(2.48);
```

**Console logging in tests:**
- Tests actively `console.log()` status messages with emoji, making test output verbose:
  ```typescript
  console.log(`📊 Found ${companies.length} companies in database`);
  console.log('✅ Company creation and retrieval test passed');
  ```

## Jest Configuration Details

```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 60000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
```

---

*Testing analysis: 2026-05-19*
