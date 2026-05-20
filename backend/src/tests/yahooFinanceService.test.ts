// Must be FIRST — prevents pg.Pool connect at module load (RESEARCH Pitfall 4)
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));
// Mock yahoo-finance2 default export — __esModule:true required for ts-jest default import resolution
jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    setGlobalConfig: jest.fn(),
    quote: jest.fn(),
    chart: jest.fn(),
    quoteSummary: jest.fn(),
    errors: {
      HTTPError: class HTTPError extends Error {
        public code?: number;
        constructor(message: string) {
          super(message);
          this.name = 'HTTPError';
        }
      },
    },
  },
}));

import yahooFinance from 'yahoo-finance2';
import { YahooFinanceService } from '../services/yahooFinanceService';

describe('YahooFinanceService', () => {
  let svc: YahooFinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new YahooFinanceService();
  });

  describe('getBulkQuotes', () => {
    test.todo('calls quote() with array, not per-symbol loop');
    test.todo('returns null for missing fields, not 0');
  });

  describe('getBulkHistoricalData', () => {
    test.todo('calls chart() not historical() and reads .quotes');
  });

  describe('withRetry', () => {
    test('retries on HTTPError code 429', async () => {
      const HTTPError = yahooFinance.errors['HTTPError'];
      const err429 = new (HTTPError as any)('Too Many Requests');
      (err429 as any).code = 429;

      const fn = jest.fn();
      // Reject with 429 twice then succeed
      fn.mockRejectedValueOnce(err429)
        .mockRejectedValueOnce(err429)
        .mockResolvedValueOnce('success');

      // Access private method via type cast
      const result = await (svc as any).withRetry(fn);
      expect(fn).toHaveBeenCalledTimes(3);
      expect(result).toBe('success');
    });

    test('does not retry on HTTPError code 404', async () => {
      const HTTPError = yahooFinance.errors['HTTPError'];
      const err404 = new (HTTPError as any)('Not Found');
      (err404 as any).code = 404;

      const fn = jest.fn().mockRejectedValue(err404);

      await expect((svc as any).withRetry(fn)).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('setGlobalConfig', () => {
    test.todo('sets queue concurrency to 5');
  });
});
