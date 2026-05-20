# Wave 0 Empirical Findings

**Date:** 2026-05-19
**Phase:** 02-yahoo-finance-migration
**Purpose:** Resolve two blocking empirical unknowns before any feature code is written.

---

## changePercent unit

### Verification Method

Live network verification attempted: `npx ts-node -e "const yf = require('yahoo-finance2').default; yf.quote('AAPL').then(...)"`

**Result:** `UNVERIFIED-OFFLINE` — Yahoo Finance API returned rate-limit error ("Too Many Requests is not valid JSON") during verification run.

### Fallback Evidence (Source Code Inspection)

Examined `yahoo-finance2@2.13.3` installed at `backend/node_modules/yahoo-finance2/dist/cjs/src/modules/quote.js`.

The inline comment next to the field declaration shows:
```
regularMarketChangePercent: YahooNumber, // -0.53606904
regularMarketChange:        YahooNumber, // -2.9299927
regularMarketPrice:         YahooNumber, // 543.64
```

**Math check:** A stock at $543.64 that drops $2.93 has a change of approximately -0.54%. The sample value -0.53606904 matches this (-0.536%), confirming the field is already in PERCENT units, not a decimal fraction. A decimal fraction would be -0.005394... which does not match the documented sample.

### Verdict

**PERCENT** (UNVERIFIED-OFFLINE — re-run with live API when rate limit clears)

The value returned by `quote()` for `regularMarketChangePercent` is already in percent units (e.g., -0.536 means -0.536% decline). **Do NOT multiply by 100.**

### Which Service Path Is Correct?

- **`getBulkQuotes`** (line 77 in `yahooFinanceService.ts`): stores `result.regularMarketChangePercent ?? 0` directly — **CORRECT**
- **`getCombinedCompanyData`** (line 229-231 in `yahooFinanceService.ts`): multiplies `price.regularMarketChangePercent * 100` — **INCORRECT** (produces values like -53.6% from a -0.54% move)

The ×100 multiplier in `getCombinedCompanyData` must be removed in Wave 1.

---

## HTTPError import path

### Verification Method

Ran two checks:
1. `node -e "const e = require('yahoo-finance2/dist/cjs/src/lib/errors'); console.log(Object.keys(e))"` → **FAILED** with `ERR_PACKAGE_PATH_NOT_EXPORTED` — the subpath is not listed in the package `exports` field.
2. Inspected `package.json` exports: only `{ "import": "./dist/esm/src/index-node.js", "default": "./dist/cjs/src/index-node.js" }` — no error subpath exposed.

### Finding: HTTPError Is Accessible via Main Default Import

```
node -e "const yf = require('yahoo-finance2'); console.log(Object.keys(yf.default.errors))"
# Output: [ 'BadRequestError', 'HTTPError', 'InvalidOptionsError', 'NoEnvironmentError', 'FailedYahooValidationError' ]
```

The default export (`yahooFinance`) has an `errors` property containing all error classes. Crucially, verified that the `HTTPError` via `yahooFinance.errors.HTTPError` is the **same constructor** that `yahooFinanceFetch.js` uses internally to throw errors — `instanceof` checks work correctly.

```javascript
const err = new yahooFinance.errors.HTTPError('test');
err instanceof yahooFinance.errors.HTTPError  // → true
```

Also confirmed: `error.code` is set to `response.status` (a numeric HTTP status, e.g., 429 or 404) in `yahooFinanceFetch.js` line 116.

### Correct Import and Usage for TypeScript

```typescript
import yahooFinance from 'yahoo-finance2';

// In withRetry:
const { HTTPError } = yahooFinance.errors;
if (error instanceof HTTPError && error.code === 429) {
  // retry
} else if (error instanceof HTTPError && error.code === 404) {
  // skip, do not retry
}
```

**Note:** `yahooFinance.errors` is typed as `{ [key: string]: any }` in the TypeScript declarations — `HTTPError` will be `any` typed but instanceof works at runtime because it references the same constructor.

### Alternative (if import needed at module level)

Since the `dist/cjs/src/lib/errors` subpath is NOT in package exports, the **only** supported way to access `HTTPError` in TypeScript with `moduleResolution: nodenext` is through `yahooFinance.errors.HTTPError`. Direct subpath imports like `import { HTTPError } from 'yahoo-finance2/dist/cjs/src/lib/errors'` will fail TypeScript compilation with nodenext module resolution.

### Import Statement for withRetry (Wave 1 implementation)

```typescript
// At the top of yahooFinanceService.ts (already imported):
import yahooFinance from 'yahoo-finance2';

// Inside withRetry method:
const HTTPError = yahooFinance.errors['HTTPError'];
if (error instanceof HTTPError) {
  const code = (error as any).code;
  if (code === 429 && attempt < MAX_RETRIES - 1) { ... }
  // Any non-429 HTTPError: throw immediately
}
```

---

## Summary Table

| Unknown | Status | Verdict |
|---------|--------|---------|
| `regularMarketChangePercent` unit | UNVERIFIED-OFFLINE (rate limited) | **PERCENT** — do NOT multiply by 100; `getBulkQuotes` is correct; `getCombinedCompanyData` ×100 is wrong |
| `HTTPError` import path | VERIFIED | `yahooFinance.errors.HTTPError` (via default import); subpath `yahoo-finance2/dist/cjs/src/lib/errors` is NOT exported and will fail with nodenext resolution |
