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
    test('calls quote() with array, not per-symbol loop', async () => {
      const mockQuote = yahooFinance.quote as jest.Mock;
      mockQuote.mockResolvedValue([
        { symbol: 'AAPL', regularMarketPrice: 180, regularMarketChange: -1, regularMarketChangePercent: -0.55, regularMarketVolume: 1000000, marketCap: 2800000000000 },
        { symbol: 'MSFT', regularMarketPrice: 420, regularMarketChange: 2, regularMarketChangePercent: 0.48, regularMarketVolume: 800000, marketCap: 3100000000000 },
      ]);
      await svc.getBulkQuotes(['AAPL', 'MSFT']);
      // Called once with the array — not once per symbol
      expect(mockQuote).toHaveBeenCalledTimes(1);
      expect(mockQuote.mock.calls[0]![0]).toEqual(['AAPL', 'MSFT']);
    });

    test('returns null for missing fields, not 0', async () => {
      const mockQuote = yahooFinance.quote as jest.Mock;
      mockQuote.mockResolvedValue([
        { symbol: 'AAPL', regularMarketPrice: undefined, regularMarketChange: undefined, regularMarketChangePercent: undefined, regularMarketVolume: undefined, marketCap: undefined },
      ]);
      const results = await svc.getBulkQuotes(['AAPL']);
      expect(results[0]?.price).toBeNull();
      expect(results[0]?.change).toBeNull();
      expect(results[0]?.changePercent).toBeNull();
      expect(results[0]?.volume).toBeNull();
      expect(results[0]?.marketCap).toBeNull();
    });
  });

  describe('getBulkHistoricalData', () => {
    test('calls chart() not historical() and reads .quotes', async () => {
      const mockChart = yahooFinance.chart as jest.Mock;
      const today = new Date();
      mockChart.mockResolvedValue({
        quotes: [
          { date: today, open: 180.0, high: 182.5, low: 179.0, close: 181.0, volume: 50000000 },
          { date: new Date(today.getTime() - 86400000), open: 178.0, high: 180.0, low: 177.0, close: 179.0, volume: 45000000 },
        ],
      });

      const result = await svc.getBulkHistoricalData(['AAPL'], 7);

      expect(mockChart).toHaveBeenCalledTimes(1);
      // Must have called chart(), not historical()
      expect(yahooFinance.chart).toHaveBeenCalledWith('AAPL', expect.objectContaining({
        interval: '1d',
        return: 'array',
      }));
      expect(result['AAPL']).toHaveLength(2);
      expect(result['AAPL']![0]?.open).toBe(180.0);
    });

    test('preserves null fields from chart() quotes', async () => {
      const mockChart = yahooFinance.chart as jest.Mock;
      const today = new Date();
      mockChart.mockResolvedValue({
        quotes: [
          { date: today, open: null, high: null, low: null, close: null, volume: null },
        ],
      });

      const result = await svc.getBulkHistoricalData(['AAPL'], 7);

      expect(result['AAPL']![0]?.open).toBeNull();
      expect(result['AAPL']![0]?.close).toBeNull();
    });
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
