// Must mock database before importing any service module to avoid pool connect at module load (RESEARCH Pitfall 4)
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

import { companyService } from '../services/companyService';
import { HistoricalDataService } from '../services/historicalDataService';
import dbInterface from '../config/database';

describe('HistoricalDataService constants', () => {
  test('MAX_DAYS should be 365', () => {
    const svc = new HistoricalDataService();
    expect((svc as any).MAX_DAYS).toBe(365);
  });

  test('CLEANUP_DAYS should be 400', () => {
    const svc = new HistoricalDataService();
    expect((svc as any).CLEANUP_DAYS).toBe(400);
  });
});

describe('checkDataCompleteness date fix', () => {
  test('returns true when DB has data covering today at midnight UTC', () => {
    const svc = new HistoricalDataService();
    // Build 61 rows from (today - 60 days) through today (inclusive)
    // lastDate will be today's UTC midnight — endDate will be today's wall-clock time
    // Without the fix, midnight < wall-clock, so the check returns false
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
    const data = Array.from({ length: 61 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().slice(0, 10),
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 1000000,
      };
    });
    const result = (svc as any).checkDataCompleteness(data, startDate, new Date(), 60);
    expect(result).toBe(true);
  });
});

describe('bulkUpsertStockPrices', () => {
  test('calls dbInterface.query exactly once for N rows', async () => {
    const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 10 });
    (dbInterface.query as jest.Mock) = mockQuery;

    const rows = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 1000000,
    }));

    await (companyService as any).bulkUpsertStockPrices(1, rows); // as any: method lands in Plan 02

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('UNNEST');
  });

  test('does not call dbInterface.query when input is empty', async () => {
    const mockQuery = jest.fn();
    (dbInterface.query as jest.Mock) = mockQuery;

    await (companyService as any).bulkUpsertStockPrices(1, []); // as any: method lands in Plan 02

    expect(mockQuery).not.toHaveBeenCalled();
  });
});
