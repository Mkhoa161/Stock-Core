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

  /**
   * Bulk upsert stock price records using UNNEST (one statement per ticker).
   * Filters out rows where OHLC values are null before inserting.
   * On conflict (company_id, date), updates price data.
   */
  async bulkUpsertStockPrices(
    companyId: number,
    data: Array<{
      date: string;
      open: number | null;
      high: number | null;
      low: number | null;
      close: number | null;
      volume: number | null;
    }>,
  ): Promise<void> {
    const validData = data.filter(
      (row): row is typeof row & { open: number; high: number; low: number; close: number } =>
        row.open != null && row.high != null && row.low != null && row.close != null,
    );

    if (validData.length === 0) return;

    const companyIds: number[] = [];
    const dates: string[] = [];
    const opens: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    const volumes: (number | null)[] = [];

    for (const row of validData) {
      companyIds.push(companyId);
      dates.push(row.date);
      opens.push(row.open);
      highs.push(row.high);
      lows.push(row.low);
      closes.push(row.close);
      volumes.push(row.volume);
    }

    const query = `
      INSERT INTO stock_prices (
        company_id, date, open_price, high_price, low_price, close_price, volume, market_cap, created_at
      )
      SELECT
        u.company_id,
        u.date,
        u.open_price,
        u.high_price,
        u.low_price,
        u.close_price,
        u.volume,
        0,
        NOW()
      FROM UNNEST(
        $1::int[],
        $2::date[],
        $3::numeric[],
        $4::numeric[],
        $5::numeric[],
        $6::numeric[],
        $7::bigint[]
      ) AS u(company_id, date, open_price, high_price, low_price, close_price, volume)
      ON CONFLICT (company_id, date) DO UPDATE SET
        open_price  = EXCLUDED.open_price,
        high_price  = EXCLUDED.high_price,
        low_price   = EXCLUDED.low_price,
        close_price = EXCLUDED.close_price,
        volume      = EXCLUDED.volume
    `;

    await dbInterface.query(query, [companyIds, dates, opens, highs, lows, closes, volumes]);
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
   * Update company with latest market data (without historical data)
   */
  async updateCompanyMarketData(companyId: number, marketData: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number;
  }): Promise<void> {
    try {
      const today = new Date();
      
      // Update or create daily summary with latest market data
      await this.createDailySummary({
        company_id: companyId,
        date: today,
        price: marketData.price,
        day_change: marketData.change,
        day_change_percent: marketData.changePercent,
        market_cap: marketData.marketCap,
        volume: marketData.volume
      });
      
      // Update company's updated_at timestamp
      const updateQuery = `
        UPDATE companies 
        SET updated_at = NOW()
        WHERE id = $1
      `;
      await dbInterface.query(updateQuery, [companyId]);
      
      console.log(`✅ Updated market data for company ${companyId}`);
    } catch (error) {
      console.error(`❌ Error updating market data for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Update company with historical data
   */
  async updateCompanyHistoricalData(companyId: number, historicalData: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>): Promise<void> {
    try {
      await this.bulkUpsertStockPrices(companyId, historicalData);
      console.log(`✅ Updated historical data for company ${companyId}: ${historicalData.length} records`);
    } catch (error) {
      console.error(`❌ Error updating historical data for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Update company profile information
   */
  async updateCompanyProfile(companyId: number, profileData: {
    sector?: string;
    industry?: string;
    name?: string;
  }): Promise<void> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (profileData.sector !== undefined) {
        updateFields.push(`sector = $${paramIndex++}`);
        values.push(profileData.sector);
      }

      if (profileData.industry !== undefined) {
        updateFields.push(`industry = $${paramIndex++}`);
        values.push(profileData.industry);
      }

      if (profileData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(profileData.name);
      }

      if (updateFields.length === 0) {
        console.log('No fields to update for company profile');
        return;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(companyId);

      const query = `
        UPDATE companies 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;

      const result = await dbInterface.query(query, values);
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`✅ Updated profile for company ${companyId}`);
      } else {
        console.log(`⚠️ No company found with ID ${companyId}`);
      }
    } catch (error) {
      console.error(`❌ Error updating company profile for ${companyId}:`, error);
      throw error;
    }
  }

}

export const companyService = new CompanyService();
