// Must be FIRST — prevents pg.Pool connect at module load (RESEARCH Pitfall 4)
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));
// Mock yahoo-finance2 default export
jest.mock('yahoo-finance2', () => ({
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
    test.todo('retries on HTTPError code 429');
    test.todo('does not retry on HTTPError code 404');
  });

  describe('setGlobalConfig', () => {
    test.todo('sets queue concurrency to 5');
  });
});
