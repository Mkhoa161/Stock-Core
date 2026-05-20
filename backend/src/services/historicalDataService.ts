import { yahooFinanceService } from './yahooFinanceService';
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
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
  }>;
  error?: string;
  source: 'database' | 'api';
  cached: boolean;
}

export class HistoricalDataService {
  private readonly DEFAULT_DAYS = 60;   // Keep: backward compat for frontend API
  private readonly MAX_DAYS = 365;      // Changed: 1 year of storage
  private readonly CLEANUP_DAYS = 400;  // New: 35-day headroom above MAX_DAYS

  /**
   * Get historical data for a company with lazy loading
   * 1. Check database first for the exact requested range
   * 2. If not available or incomplete, fetch from FMP API
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
      
      // Step 1: Check if we have complete data in database for the exact requested range
      const dbData = await this.getHistoricalDataFromDatabase(ticker, requestedDays, fromDate, toDate);
      
      // Check if we have complete data for the requested range
      const hasCompleteData = this.checkDataCompleteness(dbData, startDate, endDate, requestedDays);
      
      if (hasCompleteData) {
        console.log(`✅ Found complete historical data in database for ${ticker} (${dbData.length} days)`);
        return {
          success: true,
          data: dbData,
          source: 'database',
          cached: true
        };
      }
      
      // Step 2: Database doesn't have complete data, fetch from Yahoo Finance
      console.log(`🔄 Database has incomplete data (${dbData.length} days), fetching from Yahoo Finance...`);
      
      // Use FMP's native date range support
      const apiData = await this.fetchHistoricalDataFromAPI(ticker, requestedDays, fromDate, toDate);
      
      if (!apiData.success || !apiData.data) {
        // If API fails but we have some data, return what we have
        if (dbData.length > 0) {
          console.log(`⚠️ API failed, returning ${dbData.length} days of cached data for ${ticker}`);
          return {
            success: true,
            data: dbData,
            source: 'database',
            cached: true
          };
        }
        
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
   * Check if the database has complete data for the requested range
   */
  private checkDataCompleteness(
    dbData: Array<{
      date: string;
      open: number | null;
      high: number | null;
      low: number | null;
      close: number | null;
      volume: number | null;
    }>,
    startDate: Date,
    endDate: Date,
    requestedDays: number
  ): boolean {
    if (dbData.length === 0) {
      return false;
    }

    const toDateStr = (d: Date): string => d.toISOString().slice(0, 10); // YYYY-MM-DD UTC

    // Sort data by date to ensure proper order
    const sortedData = dbData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Check if we have data covering the entire requested range
    const firstDate = new Date(sortedData[0]?.date || '');
    const lastDate = new Date(sortedData[sortedData.length - 1]?.date || '');
    
    // For custom date range (from/to), check if we have data from start to end
    if (startDate && endDate) {
      const hasStartData = toDateStr(firstDate) <= toDateStr(startDate);
      const hasEndData   = toDateStr(lastDate)  >= toDateStr(endDate);
      const hasEnoughDays = sortedData.length >= requestedDays;
      
      console.log(`🔍 Data completeness check: start=${hasStartData}, end=${hasEndData}, days=${hasEnoughDays}, actual=${sortedData.length}/${requestedDays}`);
      
      return hasStartData && hasEndData && hasEnoughDays;
    }
    
    // For days parameter, check if we have the most recent N days
    const expectedEndDate = new Date(); // Today
    const expectedStartDate = new Date();
    expectedStartDate.setDate(expectedEndDate.getDate() - requestedDays);
    
    const hasRecentData = toDateStr(lastDate) >= toDateStr(expectedStartDate);
    const hasEnoughDays = sortedData.length >= requestedDays;
    
    console.log(`🔍 Data completeness check: recent=${hasRecentData}, days=${hasEnoughDays}, actual=${sortedData.length}/${requestedDays}, lastDate=${lastDate.toISOString().split('T')[0]}, expectedStart=${expectedStartDate.toISOString().split('T')[0]}`);
    
    return hasRecentData && hasEnoughDays;
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
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
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
    
      // For custom date range, data is already in chronological order (ASC)
      // For default query, reverse to get chronological order (oldest to newest)
      return fromDate && toDate ? data : data.reverse();
      
    } catch (error) {
      console.error(`❌ Error getting historical data from database for ${ticker}:`, error);
      return [];
    }
  }

  private async fetchHistoricalDataFromAPI(
    ticker: string, 
    days: number,
    fromDate?: string,
    toDate?: string
  ): Promise<{
    success: boolean;
    data?: Array<{
      date: string;
      open: number | null;
      high: number | null;
      low: number | null;
      close: number | null;
      volume: number | null;
    }>;
    error?: string;
  }> {
    try {
      if (fromDate && toDate) {
        console.log(`🌐 Fetching historical data from Yahoo Finance for ${ticker} from ${fromDate} to ${toDate}...`);
      } else {
        console.log(`🌐 Fetching ${days} days of historical data from Yahoo Finance for ${ticker}...`);
      }
      
      const historicalData = await yahooFinanceService.getBulkHistoricalData([ticker], days, fromDate, toDate);
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
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
  }>): Promise<void> {
    try {
      // Get company ID
      const company = await companyService.getCompanyByTicker(ticker);
      if (!company) {
        console.error(`❌ Company ${ticker} not found in database`);
        return;
      }
      
      try {
        await companyService.bulkUpsertStockPrices(company.id, data);
        console.log(`✅ Cached ${data.length} historical records for ${ticker}`);
      } catch (error) {
        console.error(`❌ Bulk upsert failed for ${ticker}:`, error);
        // Per D-03: skip this ticker, do not re-throw
      }
      
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
      cutoffDate.setDate(cutoffDate.getDate() - this.CLEANUP_DAYS); // 400 days
      
      const query = 'DELETE FROM stock_prices WHERE date < $1';
      const result = await dbInterface.query(query, [cutoffDate]);
      
      console.log(`🧹 Cleaned up ${result.rowCount} old historical records`);
      
    } catch (error) {
      console.error('❌ Error cleaning up old historical data:', error);
    }
  }
}

export const historicalDataService = new HistoricalDataService();