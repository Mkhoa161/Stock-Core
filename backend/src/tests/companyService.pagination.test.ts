// Must mock database before importing any service module to avoid pool connect at module load (RESEARCH Pitfall 4)
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

import { companyService } from '../services/companyService';
import dbInterface from '../config/database';

describe('CompanyService.getAllCompaniesWithLatestDataPaginated', () => {
  describe('pagination math', () => {
    test('page 1 passes OFFSET 0 to query', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '10' }] }) // COUNT
        .mockResolvedValueOnce({ rows: [] }); // data
      (dbInterface.query as jest.Mock) = mockQuery;

      await (companyService as any).getAllCompaniesWithLatestDataPaginated(1, 10, '');

      const dataCallParams = mockQuery.mock.calls[1]![1] as number[];
      expect(dataCallParams[1]).toBe(0); // offset = (1-1)*10 = 0
    });

    test('page 3 with limit 10 passes OFFSET 20', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '30' }] })
        .mockResolvedValueOnce({ rows: [] });
      (dbInterface.query as jest.Mock) = mockQuery;

      await (companyService as any).getAllCompaniesWithLatestDataPaginated(3, 10, '');

      const dataCallParams = mockQuery.mock.calls[1]![1] as number[];
      expect(dataCallParams[1]).toBe(20); // offset = (3-1)*10 = 20
    });
  });

  describe('response shape', () => {
    test('returns { data, total } with parsed integer total', async () => {
      const mockRows = [{ id: 1, ticker: 'AAPL', name: 'Apple Inc.' }];
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '500' }] })
        .mockResolvedValueOnce({ rows: mockRows });
      (dbInterface.query as jest.Mock) = mockQuery;

      const result = await (companyService as any).getAllCompaniesWithLatestDataPaginated(1, 50, '');

      expect(result.total).toBe(500); // parseInt, not '500'
      expect(result.data).toEqual(mockRows);
    });
  });

  describe('search filtering', () => {
    test('passes search param to both COUNT and data queries', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: [] });
      (dbInterface.query as jest.Mock) = mockQuery;

      await (companyService as any).getAllCompaniesWithLatestDataPaginated(1, 50, 'apple');

      // COUNT query params: [searchParam]
      expect(mockQuery.mock.calls[0]![1]).toEqual(['%apple%']);
      // data query params: [limit, offset, searchParam]
      expect(mockQuery.mock.calls[1]![1]).toEqual([50, 0, '%apple%']);
    });

    test('omits search param arrays when search is empty string', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '500' }] })
        .mockResolvedValueOnce({ rows: [] });
      (dbInterface.query as jest.Mock) = mockQuery;

      await (companyService as any).getAllCompaniesWithLatestDataPaginated(1, 50, '');

      expect(mockQuery.mock.calls[0]![1]).toEqual([]); // countParams
      expect(mockQuery.mock.calls[1]![1]).toEqual([50, 0]); // dataParams
    });
  });
});
