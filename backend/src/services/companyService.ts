import dbInterface from '../config/database';
import { Company, StockPrice, DailySummary, CompanyWithLatestData, CreateCompanyInput, CreateStockPriceInput, CreateDailySummaryInput } from '../models/company';


export class CompanyService {
  async getAllCompanies(): Promise<Company[]> {
    const query = 'SELECT * FROM companies ORDER BY ticker';
    const result = await dbInterface.query(query);
    return result.rows;
  }

  async getAllCompaniesWithLatestData(): Promise<CompanyWithLatestData[]> {
    const query = `
      SELECT 
        c.*,
        ds.price as latest_price,
        ds.day_change as latest_day_change,
        ds.day_change_percent as latest_day_change_percent,
        ds.market_cap as latest_market_cap,
        ds.volume as latest_volume
      FROM companies c
      LEFT JOIN daily_summaries ds ON c.id = ds.company_id
      WHERE ds.date = (SELECT MAX(date) FROM daily_summaries WHERE company_id = c.id)
      OR ds.date IS NULL
      ORDER BY c.ticker
    `;
    const result = await dbInterface.query(query);
    return result.rows;
  }

  async getCompanyByTicker(ticker: string): Promise<Company | null> {
    const query = 'SELECT * FROM companies WHERE ticker = $1';
    const result = await dbInterface.query(query, [ticker.toUpperCase()]);
    return result.rows[0] || null;
  }

  async getCompanyWithLatestData(ticker: string): Promise<CompanyWithLatestData | null> {
    const query = `
      SELECT 
        c.*,
        ds.price as latest_price,
        ds.day_change as latest_day_change,
        ds.day_change_percent as latest_day_change_percent,
        ds.market_cap as latest_market_cap,
        ds.volume as latest_volume
      FROM companies c
      LEFT JOIN daily_summaries ds ON c.id = ds.company_id
      WHERE c.ticker = $1
      AND (ds.date = (SELECT MAX(date) FROM daily_summaries WHERE company_id = c.id) OR ds.date IS NULL)
    `;
    const result = await dbInterface.query(query, [ticker.toUpperCase()]);
    return result.rows[0] || null;
  }

  async getStockPrices(ticker: string, days: number = 30): Promise<StockPrice[]> {
    const query = `
      SELECT sp.*
      FROM stock_prices sp
      JOIN companies c ON sp.company_id = c.id
      WHERE c.ticker = $1
      ORDER BY sp.date DESC
      LIMIT $2
    `;
    const result = await dbInterface.query(query, [ticker.toUpperCase(), days]);
    return result.rows;
  }

  async getDailySummaries(ticker: string, days: number = 30): Promise<DailySummary[]> {
    const query = `
      SELECT ds.*
      FROM daily_summaries ds
      JOIN companies c ON ds.company_id = c.id
      WHERE c.ticker = $1
      ORDER BY ds.date DESC
      LIMIT $2
    `;
    const result = await dbInterface.query(query, [ticker.toUpperCase(), days]);
    return result.rows;
  }

  async createCompany(companyData: CreateCompanyInput): Promise<Company> {
    const query = `
      INSERT INTO companies (ticker, name, sector, industry, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;
    const result = await dbInterface.query(query, [
      companyData.ticker.toUpperCase(),
      companyData.name,
      companyData.sector,
      companyData.industry
    ]);
    return result.rows[0];
  }

  async createStockPrice(priceData: CreateStockPriceInput): Promise<StockPrice> {
    const query = `
      INSERT INTO stock_prices (company_id, date, open_price, high_price, low_price, close_price, volume, market_cap, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (company_id, date) DO UPDATE SET
        open_price = EXCLUDED.open_price,
        high_price = EXCLUDED.high_price,
        low_price = EXCLUDED.low_price,
        close_price = EXCLUDED.close_price,
        volume = EXCLUDED.volume,
        market_cap = EXCLUDED.market_cap
      RETURNING *
    `;
    const result = await dbInterface.query(query, [
      priceData.company_id,
      priceData.date,
      priceData.open_price,
      priceData.high_price,
      priceData.low_price,
      priceData.close_price,
      priceData.volume,
      priceData.market_cap
    ]);
    return result.rows[0];
  }

  async createDailySummary(summaryData: CreateDailySummaryInput): Promise<DailySummary> {
    const query = `
      INSERT INTO daily_summaries (company_id, date, price, day_change, day_change_percent, market_cap, volume, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (company_id, date) DO UPDATE SET
        price = EXCLUDED.price,
        day_change = EXCLUDED.day_change,
        day_change_percent = EXCLUDED.day_change_percent,
        market_cap = EXCLUDED.market_cap,
        volume = EXCLUDED.volume
      RETURNING *
    `;
    const result = await dbInterface.query(query, [
      summaryData.company_id,
      summaryData.date,
      summaryData.price,
      summaryData.day_change,
      summaryData.day_change_percent,
      summaryData.market_cap,
      summaryData.volume
    ]);
    return result.rows[0];
  }

  /**
   * Fetch and store latest data from Alpha Vantage API
   */
  async updateCompanyDataFromAPI(ticker: string): Promise<boolean> {
    try {
      // Import FMP service
      const { fmpService } = await import('./fmpService.js');
      
      // Get company from database
      let company = await this.getCompanyByTicker(ticker);
      if (!company) {
        // Try to create company from FMP data
        const combinedData = await fmpService.getCombinedCompanyData([ticker]);
        const companyData = combinedData[0];
        if (!companyData) {
          throw new Error(`Company not found and could not fetch from FMP: ${ticker}`);
        }
        
        company = await this.createCompany({
          ticker: companyData.symbol,
          name: companyData.companyName,
          sector: companyData.sector,
          industry: companyData.industry
        });
      }

      if (!company) {
        throw new Error(`Failed to create or retrieve company: ${ticker}`);
      }

      // At this point, company is guaranteed to be non-null
      const companyId = company.id;

      // Get latest combined data from FMP
      const combinedData = await fmpService.getCombinedCompanyData([ticker]);
      const companyData = combinedData[0];
      if (!companyData) {
        throw new Error(`Could not fetch data for ${ticker}`);
      }

      // Get historical data for the last 30 days
      const historicalData = await fmpService.getBulkHistoricalData([ticker], 30);
      const chartData = historicalData[ticker];
      if (!chartData || chartData.length === 0) {
        throw new Error(`Could not fetch chart data for ${ticker}`);
      }

      // Process each day's data
      for (let i = 0; i < chartData.length; i++) {
        const dayData = chartData[i];
        if (!dayData) continue;
        
        const date = new Date(dayData.date);
        const open = dayData.open;
        const high = dayData.high;
        const low = dayData.low;
        const close = dayData.close;
        const volume = dayData.volume;

        if (open && high && low && close) {
          // Store stock price data
          await this.createStockPrice({
            company_id: companyId,
            date,
            open_price: open,
            high_price: high,
            low_price: low,
            close_price: close,
            volume,
            market_cap: companyData.marketCap || 0
          });

          // Calculate day change if we have previous day data
          if (i > 0) {
            const previousClose = chartData[i - 1]?.close || close;
            const dayChange = close - previousClose;
            const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;

            // Store daily summary
            await this.createDailySummary({
              company_id: companyId,
              date,
              price: close,
              day_change: parseFloat(dayChange.toFixed(2)),
              day_change_percent: parseFloat(dayChangePercent.toFixed(2)),
              market_cap: companyData.marketCap || 0,
              volume
            });
          }
        }
      }

      return true;
    } catch (error) {
      console.error(`Error updating company data for ${ticker}:`, error);
      return false;
    }
  }
}

export const companyService = new CompanyService();
