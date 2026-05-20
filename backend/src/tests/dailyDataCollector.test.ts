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

import dbInterface from '../config/database';
import { DailyDataCollector } from '../lambda/dailyDataCollector';

describe('DailyDataCollector', () => {
  describe('getStaleHistoricalTickers', () => {
    test.todo('returns only tickers with data older than 7 days');
  });

  describe('getStaleProfileTickers', () => {
    test.todo('returns only tickers with missing sector or industry');
  });
});
