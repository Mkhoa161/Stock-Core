import axios from 'axios';
import dotenv from 'dotenv';

// Only load .env in development (not in AWS Lambda)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export interface FMPQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

export interface FMPHistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export interface FMPCompanyProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: number;
  volume: number;
  change: number;
}

export class FMPService {
  private apiKey: string;
  private requestCount = 0;
  private readonly DAILY_LIMIT = 250;
  private readonly BASE_URL = 'https://financialmodelingprep.com/api/v3';

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ FMP_API_KEY not found in environment variables');
    }
  }

  /**
   * Get quotes for multiple symbols in a single API call (bulk endpoint)
   * @param symbols Array of stock symbols (max 10 per call for efficiency)
   */
  async getBulkQuotes(symbols: string[]): Promise<FMPQuote[]> {
    try {
      if (!this.apiKey) {
        console.error('❌ FMP API key not configured');
        return [];
      }

      if (symbols.length === 0) {
        return [];
      }

      // Limit to 10 symbols per call for efficiency
      const symbolsToQuery = symbols.slice(0, 10);
      const symbolsString = symbolsToQuery.join(',');
      
      console.log(`📊 Fetching quotes for ${symbolsToQuery.length} symbols: ${symbolsString}`);
      
      this.requestCount++;
      console.log(`📈 API request #${this.requestCount}/${this.DAILY_LIMIT}`);
      
      const response = await axios.get(`${this.BASE_URL}/quote/${symbolsString}?apikey=${this.apiKey}`);
      const data = response.data;
      
      if (!data || !Array.isArray(data)) {
        console.warn(`⚠️ No quote data available for ${symbolsString}`);
        return [];
      }

      const quotes: FMPQuote[] = data.map((quote: any) => ({
        symbol: quote.symbol,
        price: quote.price || 0,
        change: quote.change || 0,
        changePercent: quote.changesPercentage || 0,
        volume: quote.volume || 0,
        marketCap: quote.marketCap || 0
      }));

      console.log(`✅ Got quotes for ${quotes.length} symbols`);
      return quotes;
      
    } catch (error) {
      console.error(`❌ Error fetching bulk quotes for ${symbols.join(',')}:`, error);
      return [];
    }
  }

  /**
   * Get historical data for multiple symbols (one API call per symbol)
   * @param symbols Array of stock symbols
   */
  async getBulkHistoricalData(symbols: string[], days: number = 30): Promise<Record<string, FMPHistoricalData[]>> {
    try {
      if (!this.apiKey) {
        console.error('❌ FMP API key not configured');
        return {};
      }

      if (symbols.length === 0) {
        return {};
      }

      const result: Record<string, FMPHistoricalData[]> = {};
      
      // Process symbols one by one since FMP doesn't support bulk historical data
      for (const symbol of symbols) {
        try {
          console.log(`📈 Fetching historical data for ${symbol}...`);
          
          this.requestCount++;
          console.log(`📈 API request #${this.requestCount}/${this.DAILY_LIMIT}`);
          
          const response = await axios.get(`${this.BASE_URL}/historical-price-full/${symbol}?apikey=${this.apiKey}`);
          const data = response.data;
          
          if (data && data.historical && Array.isArray(data.historical)) {
            const historical = data.historical
              .slice(0, days)
              .map((day: any) => ({
                date: day.date,
                open: day.open || 0,
                high: day.high || 0,
                low: day.low || 0,
                close: day.close || 0,
                volume: day.volume || 0,
                adjClose: day.adjClose || 0
              }));
            
            result[symbol] = historical;
            
            console.log(`✅ Got ${historical.length} days of historical data for ${symbol}`);
          } else {
            console.warn(`⚠️ No historical data available for ${symbol}`);
          }
          
          // Add small delay between requests to be safe
          await this.delay(100);
          
        } catch (error) {
          console.error(`❌ Error fetching historical data for ${symbol}:`, error);
        }
      }

      console.log(`✅ Got historical data for ${Object.keys(result).length} symbols`);
      return result;
      
    } catch (error) {
      console.error(`❌ Error fetching bulk historical data for ${symbols.join(',')}:`, error);
      return {};
    }
  }

  /**
   * Get company profiles for multiple symbols in a single API call
   * @param symbols Array of stock symbols (max 10 per call)
   */
  async getBulkCompanyProfiles(symbols: string[]): Promise<FMPCompanyProfile[]> {
    try {
      if (!this.apiKey) {
        console.error('❌ FMP API key not configured');
        return [];
      }

      if (symbols.length === 0) {
        return [];
      }

      // Limit to 10 symbols per call
      const symbolsToQuery = symbols.slice(0, 10);
      const symbolsString = symbolsToQuery.join(',');
      
      console.log(`🏢 Fetching company profiles for ${symbolsToQuery.length} symbols: ${symbolsString}`);
      
      this.requestCount++;
      console.log(`📈 API request #${this.requestCount}/${this.DAILY_LIMIT}`);
      
      const response = await axios.get(`${this.BASE_URL}/profile/${symbolsString}?apikey=${this.apiKey}`);
      const data = response.data;
      
      if (!data || !Array.isArray(data)) {
        console.warn(`⚠️ No company profile data available for ${symbolsString}`);
        return [];
      }

      const profiles: FMPCompanyProfile[] = data.map((profile: any) => ({
        symbol: profile.symbol,
        companyName: profile.companyName || '',
        sector: profile.sector || '',
        industry: profile.industry || '',
        price: profile.price || 0,
        marketCap: profile.mktCap || 0,
        volume: profile.volAvg || 0,
        change: profile.changes || 0
      }));

      console.log(`✅ Got company profiles for ${profiles.length} symbols`);
      return profiles;
      
    } catch (error) {
      console.error(`❌ Error fetching bulk company profiles for ${symbols.join(',')}:`, error);
      return [];
    }
  }

  /**
   * Get all data for S&P 500 companies efficiently
   * Uses profile endpoint for company details and quote endpoint for real-time market data
   */
  async getAllSP500Data(symbols: string[]): Promise<{
    quotes: FMPQuote[];
    profiles: FMPCompanyProfile[];
    historicalData: Record<string, FMPHistoricalData[]>;
  }> {
    console.log(`🚀 Fetching all data for ${symbols.length} S&P 500 companies...`);
    
    const quotes: FMPQuote[] = [];
    const profiles: FMPCompanyProfile[] = [];
    const historicalData: Record<string, FMPHistoricalData[]> = {};
    
    // Process symbols in batches
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}`);
      
      // Get company profiles for this batch (contains company details + some market data)
      const batchProfiles = await this.getBulkCompanyProfiles(batch);
      profiles.push(...batchProfiles);
      
      // Get quotes for this batch (contains real-time market data)
      const batchQuotes = await this.getBulkQuotes(batch);
      quotes.push(...batchQuotes);
      
      // Get historical data for this batch (one call per symbol)
      const batchHistorical = await this.getBulkHistoricalData(batch);
      Object.assign(historicalData, batchHistorical);
      
      // Add delay between batches to be safe
      if (i + batchSize < symbols.length) {
        await this.delay(1000);
      }
    }
    
    console.log(`🎉 Completed fetching data for ${symbols.length} companies`);
    console.log(`📊 Total API calls used: ${this.requestCount}/${this.DAILY_LIMIT}`);
    
    return { quotes, profiles, historicalData };
  }

  /**
   * Get combined company data efficiently
   * Uses profile for company details and quote for real-time market data
   */
  async getCombinedCompanyData(symbols: string[]): Promise<Array<{
    symbol: string;
    companyName: string;
    sector: string;
    industry: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number;
  }>> {
    try {
      if (!this.apiKey) {
        console.error('❌ FMP API key not configured');
        return [];
      }

      if (symbols.length === 0) {
        return [];
      }

      console.log(`🔗 Fetching combined data for ${symbols.length} symbols...`);
      
      // Get profiles first (company details + some market data)
      const profiles = await this.getBulkCompanyProfiles(symbols);
      
      // Get quotes for real-time market data
      const quotes = await this.getBulkQuotes(symbols);
      
      // Combine the data
      const combinedData = symbols.map(symbol => {
        const profile = profiles.find(p => p.symbol === symbol);
        const quote = quotes.find(q => q.symbol === symbol);
        
        return {
          symbol,
          companyName: profile?.companyName || symbol,
          sector: profile?.sector || '',
          industry: profile?.industry || '',
          price: quote?.price || profile?.price || 0,
          change: quote?.change || profile?.change || 0,
          changePercent: quote?.changePercent || 0,
          volume: quote?.volume || profile?.volume || 0,
          marketCap: quote?.marketCap || profile?.marketCap || 0
        };
      });
      
      console.log(`✅ Got combined data for ${combinedData.length} symbols`);
      return combinedData;
      
    } catch (error) {
      console.error(`❌ Error fetching combined company data for ${symbols.join(',')}:`, error);
      return [];
    }
  }

  /**
   * Get remaining API calls for today
   */
  getRemainingCalls(): number {
    return Math.max(0, this.DAILY_LIMIT - this.requestCount);
  }

  /**
   * Reset request counter (useful for testing)
   */
  resetRequestCounter(): void {
    this.requestCount = 0;
  }

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const quotes = await this.getBulkQuotes(['AAPL']);
      return quotes.length > 0 && (quotes[0]?.price || 0) > 0;
    } catch (error) {
      console.error('❌ FMP API health check failed:', error);
      return false;
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const fmpService = new FMPService();
