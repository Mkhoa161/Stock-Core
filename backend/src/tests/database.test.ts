import { companyService } from '../services/companyService';

describe('Database Operations Tests', () => {
  const testTicker = `T${Date.now().toString().slice(-8)}`; // 9 characters max

  beforeAll(async () => {
    console.log('🧪 Setting up database test environment...');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up database test environment...');
  });

  describe('Company Service Tests', () => {
    test('should connect to PostgreSQL database', async () => {
      const companies = await companyService.getAllCompanies();
      expect(Array.isArray(companies)).toBe(true);
      console.log(`📊 Found ${companies.length} companies in database`);
    });

    test('should create and retrieve a company', async () => {
      const testCompany = {
        ticker: testTicker,
        name: 'Test Database Company',
        sector: 'Technology',
        industry: 'Software Testing'
      };

      // Create test company
      const created = await companyService.createCompany(testCompany);
      expect(created).toBeDefined();
      expect(created.ticker).toBe(testTicker);
      expect(created.name).toBe('Test Database Company');

      // Retrieve the company
      const retrieved = await companyService.getCompanyByTicker(testTicker);
      expect(retrieved).toBeDefined();
      expect(retrieved?.ticker).toBe(testTicker);
      expect(retrieved?.name).toBe('Test Database Company');

      console.log('✅ Company creation and retrieval test passed');
    });

    test('should get companies with latest data', async () => {
      const companies = await companyService.getAllCompaniesWithLatestData();
      expect(Array.isArray(companies)).toBe(true);
      console.log(`📊 Found ${companies.length} companies with latest data`);
    });

    test('should handle duplicate ticker gracefully', async () => {
      const duplicateCompany = {
        ticker: testTicker, // This should already exist from previous test
        name: 'Duplicate Test Company',
        sector: 'Technology',
        industry: 'Software Testing'
      };

      // This should throw an error due to duplicate key
      await expect(companyService.createCompany(duplicateCompany)).rejects.toThrow();
      console.log('✅ Duplicate ticker handling test passed');
    });
  });

  describe('Stock Price Operations', () => {
    test('should create stock price records', async () => {
      const company = await companyService.getCompanyByTicker(testTicker);
      if (!company) {
        throw new Error(`${testTicker} company not found`);
      }

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

      const created = await companyService.createStockPrice(stockPriceData);
      expect(created).toBeDefined();
      expect(created.company_id).toBe(company.id);
      expect(parseFloat((created.close_price ?? 0).toString())).toBe(103.00);

      console.log('✅ Stock price creation test passed');
    });


  });

  describe('Daily Summary Operations', () => {
    test('should create daily summary records', async () => {
      const company = await companyService.getCompanyByTicker(testTicker);
      if (!company) {
        throw new Error(`${testTicker} company not found`);
      }

      const summaryData = {
        company_id: company.id,
        date: new Date('2024-01-15'),
        price: 103.00,
        day_change: 2.50,
        day_change_percent: 2.48,
        market_cap: 1000000000,
        volume: 1000000
      };

      const created = await companyService.createDailySummary(summaryData);
      expect(created).toBeDefined();
      expect(created.company_id).toBe(company.id);
      expect(parseFloat(created.price.toString())).toBe(103.00);
      expect(parseFloat(created.day_change_percent.toString())).toBe(2.48);

      console.log('✅ Daily summary creation test passed');
    });

    test('should retrieve daily summaries by ticker', async () => {
      const summaries = await companyService.getDailySummaries(testTicker, 5);
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries.length).toBeGreaterThan(0);
      
      const latest = summaries[0];
      expect(latest).toHaveProperty('company_id');
      expect(latest).toHaveProperty('date');
      expect(latest).toHaveProperty('price');
      expect(latest).toHaveProperty('day_change_percent');

      console.log(`✅ Daily summary retrieval test passed - found ${summaries.length} records`);
    });
  });
});
