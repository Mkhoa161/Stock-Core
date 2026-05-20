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
// Mock companyService singleton
jest.mock('../services/companyService', () => ({
  companyService: {
    getAllCompanies: jest.fn(),
    getCompanyByTicker: jest.fn(),
    updateCompanyMarketData: jest.fn(),
    updateCompanyProfile: jest.fn(),
  },
}));
// Mock yahooFinanceService singleton
jest.mock('../services/yahooFinanceService', () => ({
  yahooFinanceService: {
    getBulkQuotes: jest.fn(),
    getBulkHistoricalData: jest.fn(),
    getBulkCompanyProfiles: jest.fn(),
  },
}));
// Mock historicalDataService singleton
jest.mock('../services/historicalDataService', () => ({
  historicalDataService: {
    cleanupOldHistoricalData: jest.fn(),
  },
}));
// Mock scrapeSP500Companies
jest.mock('../scripts/scrapeSP500', () => ({
  scrapeSP500Companies: jest.fn(),
}));

import dbInterface from '../config/database';
import { DailyDataCollector } from '../lambda/dailyDataCollector';

describe('DailyDataCollector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStaleHistoricalTickers (YF-05)', () => {
    test('returns only tickers with data older than 7 days', async () => {
      (dbInterface.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ticker: 'AAPL' }, { ticker: 'MSFT' }],
      });

      const collector = new DailyDataCollector();
      const tickers = await (collector as any).getStaleHistoricalTickers();

      expect(tickers).toEqual(['AAPL', 'MSFT']);

      const sql: string = (dbInterface.query as jest.Mock).mock.calls[0][0];
      expect(sql).toContain('7 days');
      expect(sql).toContain('MAX(date)');
    });
  });

  describe('getStaleProfileTickers (YF-04)', () => {
    test('returns only tickers with missing sector or industry', async () => {
      (dbInterface.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ticker: 'GOOGL' }],
      });

      const collector = new DailyDataCollector();
      const tickers = await (collector as any).getStaleProfileTickers();

      expect(tickers).toContain('GOOGL');

      const sql: string = (dbInterface.query as jest.Mock).mock.calls[0][0];
      expect(sql).toContain('sector IS NULL');
    });
  });
});
