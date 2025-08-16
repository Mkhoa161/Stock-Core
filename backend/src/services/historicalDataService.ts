import { fmpService } from './fmpService';
import { companyService } from './companyService';
import dbInterface from '../config/database';
import * as dotenv from 'dotenv';

dotenv.config();

export interface HistoricalDataRequest {
  ticker: string;
  days?: number | undefined; // Default 60 days (for backward compatibility)
  fromDate?: string | undefined; // YYYY-MM-DD format
  toDate?: string | undefined;   // YYYY-MM-DD format
}

export interface HistoricalDataResponse {
  success: boolean;
  data?: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  error?: string;
  source: 'database' | 'api';
  cached: boolean;
}

export class HistoricalDataService {
  private readonly DEFAULT_DAYS = 60;
  private readonly MAX_DAYS = 60; // Hard limit for API calls

  /**
   * Get historical data for a company with lazy loading
   * 1. Check database first
   * 2. If not available, fetch from FMP API
   * 3. Cache in database and return
   */
  async getHistoricalData(request: HistoricalDataRequest): Promise<HistoricalDataResponse> {
    const { ticker, days, fromDate, toDate } = request;
    
    try {
      // Determine the date range to fetch
      let startDate: Date;
      let endDate: Date;
      let requestedDays: number;
      
      if (fromDate && toDate) {
        // Custom date range
        startDate = new Date(fromDate);
        endDate = new Date(toDate);
        requestedDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`📈 Getting historical data for ${ticker} from ${fromDate} to ${toDate} (${requestedDays} days)...`);
      } else {
        // Backward compatibility: use days from current date
        const daysToFetch = days || this.DEFAULT_DAYS;
        requestedDays = Math.min(daysToFetch, this.MAX_DAYS);
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - requestedDays);
        console.log(`📈 Getting historical data for ${ticker} (${requestedDays} days)...`);
      }
      
      // Validate date range
      if (requestedDays > this.MAX_DAYS) {
        console.log(`⚠️ Requested ${requestedDays} days, limiting to ${this.MAX_DAYS} days`);
        requestedDays = this.MAX_DAYS;
      }
      
      // Step 1: Check if we have data in database for the requested range
      const dbData = await this.getHistoricalDataFromDatabase(ticker, requestedDays, fromDate, toDate);
      
      if (fromDate && toDate) {
        // For custom date range, return all data found (don't limit by requestedDays)
        if (dbData.length > 0) {
          console.log(`✅ Found ${dbData.length} days of historical data in database for ${ticker} in date range`);
          return {
            success: true,
            data: dbData,
            source: 'database',
            cached: true
          };
        }
      } else {
        // For backward compatibility (days parameter), check if we have enough data
        if (dbData.length >= requestedDays) {
          console.log(`✅ Found ${dbData.length} days of historical data in database for ${ticker}`);
          return {
            success: true,
            data: dbData.slice(0, requestedDays),
            source: 'database',
            cached: true
          };
        }
      }
      
      // Step 2: Database doesn't have enough data, fetch from FMP
      console.log(`🔄 Database has ${dbData.length} days, fetching from FMP...`);
      
      // Use FMP's native date range support
      const apiData = await this.fetchHistoricalDataFromAPI(ticker, requestedDays, fromDate, toDate);
      
      if (!apiData.success || !apiData.data) {
        return {
          success: false,
          error: apiData.error || 'Failed to fetch historical data from API',
          source: 'api',
          cached: false
        };
      }
      
      // Step 3: Cache the new data in database
      await this.cacheHistoricalData(ticker, apiData.data);
      
      console.log(`✅ Cached ${apiData.data.length} days of historical data for ${ticker}`);
      
      return {
        success: true,
        data: apiData.data,
        source: 'api',
        cached: false
      };
      
    } catch (error) {
      console.error(`❌ Error getting historical data for ${ticker}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'api',
        cached: false
      };
    }
  }

  /**
   * Get historical data from database
   */
  private async getHistoricalDataFromDatabase(
    ticker: string, 
    days: number, 
    fromDate?: string, 
    toDate?: string
  ): Promise<Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      let query: string;
      let params: any[];
      
      if (fromDate && toDate) {
        // Custom date range query
                 query = `
           SELECT 
             date,
             open_price as open,
             high_price as high,
             low_price as low,
             close_price as close,
             volume
           FROM stock_prices sp
           JOIN companies c ON sp.company_id = c.id
           WHERE c.ticker = $1
             AND date >= $2
             AND date <= $3
           ORDER BY date ASC
         `;
        params = [ticker.toUpperCase(), fromDate, toDate];
      } else {
        // Default: get last N days
                 query = `
           SELECT 
             date,
             open_price as open,
             high_price as high,
             low_price as low,
             close_price as close,
             volume
           FROM stock_prices sp
           JOIN companies c ON sp.company_id = c.id
           WHERE c.ticker = $1
           ORDER BY date DESC
           LIMIT $2
         `;
        params = [ticker.toUpperCase(), days];
      }
      
      const result = await dbInterface.query(query, params);
      
             // Convert to expected format
       const data = result.rows.map(row => ({
         date: row.date,
         open: row.open,
         high: row.high,
         low: row.low,
         close: row.close,
         volume: row.volume
       }));
      
      // For custom date range, data is already in correct order (ASC)
      // For default query, reverse to get oldest first
      return fromDate && toDate ? data : data.reverse();
      
    } catch (error) {
      console.error(`❌ Error getting historical data from database for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Fetch historical data from FMP API
   */
  private async fetchHistoricalDataFromAPI(
    ticker: string, 
    days: number,
    fromDate?: string,
    toDate?: string
  ): Promise<{
    success: boolean;
    data?: Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    error?: string;
  }> {
    try {
      if (fromDate && toDate) {
        console.log(`🌐 Fetching historical data from FMP for ${ticker} from ${fromDate} to ${toDate}...`);
      } else {
        console.log(`🌐 Fetching ${days} days of historical data from FMP for ${ticker}...`);
      }
      
      const historicalData = await fmpService.getBulkHistoricalData([ticker], days, fromDate, toDate);
      const data = historicalData[ticker];
      
      if (!data || data.length === 0) {
        return {
          success: false,
          error: `No historical data available for ${ticker}`
        };
      }
      
      return {
        success: true,
        data: data
      };
      
    } catch (error) {
      console.error(`❌ Error fetching historical data from API for ${ticker}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API fetch failed'
      };
    }
  }

  /**
   * Cache historical data in database
   */
  private async cacheHistoricalData(ticker: string, data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>): Promise<void> {
    try {
      // Get company ID
      const company = await companyService.getCompanyByTicker(ticker);
      if (!company) {
        console.error(`❌ Company ${ticker} not found in database`);
        return;
      }
      
      let cachedCount = 0;
      
      // Cache each day's data
      for (const dayData of data) {
        try {
          const date = new Date(dayData.date);
          
          await companyService.createStockPrice({
            company_id: company.id,
            date,
            open_price: dayData.open,
            high_price: dayData.high,
            low_price: dayData.low,
            close_price: dayData.close,
            volume: dayData.volume,
            market_cap: 0 // Will be updated with current market cap later
          });
          
          cachedCount++;
          
        } catch (error: any) {
          // Skip if record already exists (unique constraint)
          if (error.message?.includes('UNIQUE constraint failed') || error.message?.includes('duplicate key')) {
            // Record already exists, skip
          } else {
            console.error(`❌ Error caching historical data for ${ticker} on ${dayData.date}:`, error);
          }
        }
      }
      
      console.log(`✅ Cached ${cachedCount} new historical records for ${ticker}`);
      
    } catch (error) {
      console.error(`❌ Error caching historical data for ${ticker}:`, error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    totalCompanies: number;
    companiesWithHistoricalData: number;
    totalHistoricalRecords: number;
    averageRecordsPerCompany: number;
  }> {
    try {
      // Get total companies
      const totalCompaniesQuery = 'SELECT COUNT(*) as count FROM companies';
      const totalCompaniesResult = await dbInterface.query(totalCompaniesQuery);
      const totalCompanies = parseInt(totalCompaniesResult.rows[0].count);
      
      // Get companies with historical data
      const companiesWithDataQuery = `
        SELECT COUNT(DISTINCT c.id) as count
        FROM companies c
        JOIN stock_prices sp ON c.id = sp.company_id
      `;
      const companiesWithDataResult = await dbInterface.query(companiesWithDataQuery);
      const companiesWithHistoricalData = parseInt(companiesWithDataResult.rows[0].count);
      
      // Get total historical records
      const totalRecordsQuery = 'SELECT COUNT(*) as count FROM stock_prices';
      const totalRecordsResult = await dbInterface.query(totalRecordsQuery);
      const totalHistoricalRecords = parseInt(totalRecordsResult.rows[0].count);
      
      const averageRecordsPerCompany = companiesWithHistoricalData > 0 
        ? Math.round(totalHistoricalRecords / companiesWithHistoricalData)
        : 0;
      
      return {
        totalCompanies,
        companiesWithHistoricalData,
        totalHistoricalRecords,
        averageRecordsPerCompany
      };
      
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return {
        totalCompanies: 0,
        companiesWithHistoricalData: 0,
        totalHistoricalRecords: 0,
        averageRecordsPerCompany: 0
      };
    }
  }

  /**
   * Clean up old historical data (keep only 60 days)
   */
  async cleanupOldHistoricalData(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.MAX_DAYS);
      
      const query = 'DELETE FROM stock_prices WHERE date < $1';
      const result = await dbInterface.query(query, [cutoffDate]);
      
      console.log(`🧹 Cleaned up ${result.rowCount} old historical records`);
      
    } catch (error) {
      console.error('❌ Error cleaning up old historical data:', error);
    }
  }
}

export const historicalDataService = new HistoricalDataService();
