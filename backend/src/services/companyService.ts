import dbInterface from '../config/database';
import { Company, StockPrice, DailySummary, CompanyWithLatestData, CreateCompanyInput, CreateStockPriceInput, CreateDailySummaryInput } from '../models/company';
import { yahooFinanceService } from './yahooFinanceService';

export class CompanyService {
  async getAllCompaniesWithLatestData(): Promise<CompanyWithLatestData[]> {
    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL
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
    } else {
      // SQLite
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
      const companies = await dbInterface.dbAll(query);
      return companies;
    }
  }

  async getCompanyByTicker(ticker: string): Promise<Company | null> {
    if (process.env.NODE_ENV === 'production') {
      const query = 'SELECT * FROM companies WHERE ticker = $1';
      const result = await dbInterface.query(query, [ticker.toUpperCase()]);
      return result.rows[0] || null;
    } else {
      const query = 'SELECT * FROM companies WHERE ticker = ?';
      const company = await dbInterface.dbGet(query, [ticker.toUpperCase()]);
      return company || null;
    }
  }

  async getCompanyWithLatestData(ticker: string): Promise<CompanyWithLatestData | null> {
    if (process.env.NODE_ENV === 'production') {
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
    } else {
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
        WHERE c.ticker = ?
        AND (ds.date = (SELECT MAX(date) FROM daily_summaries WHERE company_id = c.id) OR ds.date IS NULL)
      `;
      const company = await dbInterface.dbGet(query, [ticker.toUpperCase()]);
      return company || null;
    }
  }

  async getStockPrices(ticker: string, days: number = 30): Promise<StockPrice[]> {
    if (process.env.NODE_ENV === 'production') {
      const query = `
        SELECT sp.*
        FROM stock_prices sp
        JOIN companies c ON sp.company_id = c.id
        WHERE c.ticker = $1
        ORDER BY sp.date DESC
        LIMIT $2
      `;
      const result = await dbInterface.query(query, [ticker.toUpperCase(), days]);
      return result.rows.reverse(); // Return in chronological order
    } else {
      const query = `
        SELECT sp.*
        FROM stock_prices sp
        JOIN companies c ON sp.company_id = c.id
        WHERE c.ticker = ?
        ORDER BY sp.date DESC
        LIMIT ?
      `;
      const prices = await dbInterface.dbAll(query, [ticker.toUpperCase(), days]);
      return prices.reverse(); // Return in chronological order
    }
  }

  async createCompany(companyData: CreateCompanyInput): Promise<Company> {
    if (process.env.NODE_ENV === 'production') {
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
    } else {
      const query = `
        INSERT INTO companies (ticker, name, sector, industry, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      const result: any = await dbInterface.dbRun(query, [
        companyData.ticker.toUpperCase(),
        companyData.name,
        companyData.sector,
        companyData.industry
      ]);
      const company = await this.getCompanyByTicker(companyData.ticker);
      if (!company) {
        throw new Error('Failed to create company');
      }
      return company;
    }
  }

  async createStockPrice(priceData: CreateStockPriceInput): Promise<StockPrice> {
    if (process.env.NODE_ENV === 'production') {
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
    } else {
      const query = `
        INSERT OR REPLACE INTO stock_prices (company_id, date, open_price, high_price, low_price, close_price, volume, market_cap, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      await dbInterface.dbRun(query, [
        priceData.company_id,
        priceData.date.toISOString().split('T')[0],
        priceData.open_price,
        priceData.high_price,
        priceData.low_price,
        priceData.close_price,
        priceData.volume,
        priceData.market_cap
      ]);
      
      // Get the created/updated record
      const query2 = `
        SELECT * FROM stock_prices 
        WHERE company_id = ? AND date = ?
      `;
      const price = await dbInterface.dbGet(query2, [
        priceData.company_id,
        priceData.date.toISOString().split('T')[0]
      ]);
      if (!price) {
        throw new Error('Failed to create stock price');
      }
      return price;
    }
  }

  async createDailySummary(summaryData: CreateDailySummaryInput): Promise<DailySummary> {
    if (process.env.NODE_ENV === 'production') {
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
    } else {
      const query = `
        INSERT OR REPLACE INTO daily_summaries (company_id, date, price, day_change, day_change_percent, market_cap, volume, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      await dbInterface.dbRun(query, [
        summaryData.company_id,
        summaryData.date.toISOString().split('T')[0],
        summaryData.price,
        summaryData.day_change,
        summaryData.day_change_percent,
        summaryData.market_cap,
        summaryData.volume
      ]);
      
      // Get the created/updated record
      const query2 = `
        SELECT * FROM daily_summaries 
        WHERE company_id = ? AND date = ?
      `;
      const summary = await dbInterface.dbGet(query2, [
        summaryData.company_id,
        summaryData.date.toISOString().split('T')[0]
      ]);
      if (!summary) {
        throw new Error('Failed to create daily summary');
      }
      return summary;
    }
  }

  /**
   * Fetch and store latest data from Yahoo Finance
   */
  async updateCompanyDataFromYahoo(ticker: string): Promise<boolean> {
    try {
      // Get company from database
      let company = await this.getCompanyByTicker(ticker);
      if (!company) {
        // Try to create company from Yahoo Finance data
        const quote = await yahooFinanceService.getQuote(ticker);
        if (!quote) {
          throw new Error(`Company not found and could not fetch from Yahoo Finance: ${ticker}`);
        }
        
        company = await this.createCompany({
          ticker: quote.symbol,
          name: quote.longName || quote.shortName || ticker,
          sector: '',
          industry: ''
        });
      }

      if (!company) {
        throw new Error(`Failed to create or retrieve company: ${ticker}`);
      }

      // At this point, company is guaranteed to be non-null
      const companyId = company.id;

      // Get latest quote from Yahoo Finance
      const quote = await yahooFinanceService.getQuote(ticker);
      if (!quote) {
        throw new Error(`Could not fetch quote for ${ticker}`);
      }

      // Get historical data for the last 30 days
      const chartData = await yahooFinanceService.getChartData(ticker, 30);
      if (!chartData || !chartData.indicators.quote || chartData.indicators.quote.length === 0) {
        throw new Error(`Could not fetch chart data for ${ticker}`);
      }

      const quoteData = chartData.indicators.quote[0];
      if (!quoteData) {
        throw new Error(`No quote data available for ${ticker}`);
      }

      const timestamps = chartData.timestamp || [];

      // Process each day's data
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        if (!timestamp) continue;
        
        const date = new Date(timestamp * 1000);
        const open = quoteData.open?.[i] || 0;
        const high = quoteData.high?.[i] || 0;
        const low = quoteData.low?.[i] || 0;
        const close = quoteData.close?.[i] || 0;
        const volume = quoteData.volume?.[i] || 0;

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
            market_cap: quote.marketCap
          });

          // Calculate day change if we have previous day data
          if (i > 0) {
            const previousClose = quoteData.close?.[i - 1] || close;
            const dayChange = close - previousClose;
            const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;

            // Store daily summary
            await this.createDailySummary({
              company_id: companyId,
              date,
              price: close,
              day_change: parseFloat(dayChange.toFixed(2)),
              day_change_percent: parseFloat(dayChangePercent.toFixed(2)),
              market_cap: quote.marketCap,
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
