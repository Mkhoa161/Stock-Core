import yahooFinance from 'yahoo-finance2';

export interface StockQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: number;
  marketCap: number;
  volume: number;
  previousClose: number;
  open: number;
  dayLow: number;
  dayHigh: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  priceToBook: number;
  priceToEarnings: number;
  dividendYield: number;
  companyName: string;
}

export interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CompanySearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export class YahooFinanceService {
  /**
   * Get real-time quote for a single stock
   */
  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const quote = await yahooFinance.quote(symbol);
      
      return {
        symbol: quote.symbol,
        regularMarketPrice: quote.regularMarketPrice || 0,
        regularMarketChange: quote.regularMarketChange || 0,
        regularMarketChangePercent: quote.regularMarketChangePercent || 0,
        regularMarketTime: typeof quote.regularMarketTime === 'number' ? quote.regularMarketTime : Date.now(),
        marketCap: quote.marketCap || 0,
        volume: quote.regularMarketVolume || 0, // Use regularMarketVolume instead of volume
        previousClose: quote.regularMarketPreviousClose || 0,
        open: quote.regularMarketOpen || 0,
        dayLow: quote.regularMarketDayLow || 0,
        dayHigh: quote.regularMarketDayHigh || 0,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
        priceToBook: quote.priceToBook || 0,
        priceToEarnings: quote.trailingPE || 0,
        dividendYield: quote.trailingAnnualDividendYield || 0,
        companyName: quote.longName || quote.shortName || quote.symbol
      };
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get real-time quotes for multiple stocks in a single API call
   */
  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    try {
      const quotes = await yahooFinance.quote(symbols);
      return quotes.map(quote => ({
        symbol: quote.symbol,
        regularMarketPrice: quote.regularMarketPrice || 0,
        regularMarketChange: quote.regularMarketChange || 0,
        regularMarketChangePercent: quote.regularMarketChangePercent || 0,
        regularMarketTime: typeof quote.regularMarketTime === 'number' ? quote.regularMarketTime : Date.now(),
        marketCap: quote.marketCap || 0,
        volume: quote.regularMarketVolume || 0, // Use regularMarketVolume instead of volume
        previousClose: quote.regularMarketPreviousClose || 0,
        open: quote.regularMarketOpen || 0,
        dayLow: quote.regularMarketDayLow || 0,
        dayHigh: quote.regularMarketDayHigh || 0,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
        priceToBook: quote.priceToBook || 0,
        priceToEarnings: quote.trailingPE || 0,
        dividendYield: quote.trailingAnnualDividendYield || 0,
        companyName: quote.longName || quote.shortName || quote.symbol
      }));
    } catch (error) {
      console.error(`Failed to fetch multiple quotes for ${symbols.join(',')}:`, error);
      return [];
    }
  }

  /**
   * Get historical chart data for a stock
   */
  async getChartData(symbol: string, days: number = 30): Promise<ChartDataPoint[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const chartData = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });

      return chartData.map(candle => ({
        timestamp: candle.date.getTime(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0
      }));
    } catch (error) {
      console.error(`Failed to fetch chart data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Search for companies by ticker or name
   */
  async searchCompanies(query: string): Promise<CompanySearchResult[]> {
    try {
      const searchResults = await yahooFinance.search(query);
      
      // Handle different response structures
      if (Array.isArray(searchResults)) {
        return searchResults.map(result => ({
          symbol: result.symbol || result.ticker || '',
          name: result.name || result.longName || result.shortName || '',
          exchange: result.exchange || result.fullExchangeName || '',
          type: result.type || result.quoteType || ''
        }));
      } else if (searchResults.quotes) {
        // Handle response with quotes property
        return searchResults.quotes.map((result: any) => ({
          symbol: result.symbol || result.ticker || '',
          name: result.name || result.longName || result.shortName || '',
          exchange: result.exchange || result.fullExchangeName || '',
          type: result.type || result.quoteType || ''
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Failed to search for companies with query "${query}":`, error);
      return [];
    }
  }

  /**
   * Test if a symbol is valid and accessible
   */
  async isValidSymbol(symbol: string): Promise<boolean> {
    try {
      const quote = await yahooFinance.quote(symbol);
      return quote && quote.symbol === symbol;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get market summary data
   */
  async getMarketSummary(): Promise<any> {
    try {
      // Get major indices
      const indices = await yahooFinance.quote(['^GSPC', '^IXIC', '^DJI', '^VIX']);
      return indices;
    } catch (error) {
      console.error('Failed to fetch market summary:', error);
      return null;
    }
  }

  /**
   * Get companies from major market indices (S&P 500, NASDAQ, Dow Jones)
   * These represent tier 1 companies
   */
  async getTier1Companies(): Promise<CompanySearchResult[]> {
    try {
      console.log('📊 Fetching tier 1 companies from major indices...');
      
      // S&P 500 companies (top 500 US companies by market cap)
      const sp500Companies = await this.getIndexCompanies('^GSPC');
      
      // NASDAQ-100 companies (top 100 NASDAQ companies)
      const nasdaqCompanies = await this.getIndexCompanies('^IXIC');
      
      // Dow Jones Industrial Average (30 blue-chip companies)
      const dowCompanies = await this.getIndexCompanies('^DJI');
      
      // Combine and deduplicate
      const allCompanies = [...sp500Companies, ...nasdaqCompanies, ...dowCompanies];
      const uniqueCompanies = this.deduplicateCompanies(allCompanies);
      
      console.log(`✅ Found ${uniqueCompanies.length} unique tier 1 companies`);
      return uniqueCompanies;
    } catch (error) {
      console.error('Failed to fetch tier 1 companies:', error);
      return [];
    }
  }

  /**
   * Get companies from specific market index
   */
  private async getIndexCompanies(indexSymbol: string): Promise<CompanySearchResult[]> {
    try {
      // Get index components - this is a simplified approach
      // In practice, you might need to use a different API or data source
      const indexQuote = await yahooFinance.quote(indexSymbol);
      
      // For now, return empty array as Yahoo Finance doesn't provide index components directly
      // This is a placeholder for when we implement a proper index components API
      return [];
    } catch (error) {
      console.error(`Failed to fetch companies for index ${indexSymbol}:`, error);
      return [];
    }
  }

  /**
   * Get companies by sector (alternative approach)
   */
  async getCompaniesBySector(sector: string): Promise<CompanySearchResult[]> {
    try {
      // Search for companies in specific sectors
      const searchResults = await yahooFinance.search(sector);
      
      if (Array.isArray(searchResults)) {
        return searchResults
          .filter(result => result.type === 'equity')
          .map(result => ({
            symbol: result.symbol || result.ticker || '',
            name: result.name || result.longName || result.shortName || '',
            exchange: result.exchange || result.fullExchangeName || '',
            type: result.type || result.quoteType || ''
          }));
      }
      
      return [];
    } catch (error) {
      console.error(`Failed to fetch companies for sector ${sector}:`, error);
      return [];
    }
  }

  /**
   * Get top companies by market cap (tier 1 approach)
   */
  async getTopCompaniesByMarketCap(limit: number = 100): Promise<CompanySearchResult[]> {
    try {
      console.log(`📊 Fetching top ${limit} companies by market cap...`);
      
      // This would require a different API that provides market cap rankings
      // For now, we'll use a combination of known large-cap companies
      const largeCapSymbols = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK-B',
        'UNH', 'JNJ', 'JPM', 'V', 'PG', 'HD', 'MA', 'DIS', 'PYPL', 'ADBE',
        'CRM', 'NFLX', 'INTC', 'CMCSA', 'PFE', 'TMO', 'ABT', 'KO', 'PEP',
        'AVGO', 'COST', 'DHR', 'MRK', 'ACN', 'WMT', 'TXN', 'QCOM', 'HON',
        'LOW', 'UNP', 'UPS', 'RTX', 'IBM', 'CAT', 'DE', 'BA', 'GS', 'MS'
      ];
      
      const companies: CompanySearchResult[] = [];
      
      // Get quotes for these companies to verify they exist and get names
      for (const symbol of largeCapSymbols.slice(0, limit)) {
        try {
          const quote = await yahooFinance.quote(symbol);
          if (quote) {
            companies.push({
              symbol: quote.symbol,
              name: quote.longName || quote.shortName || quote.symbol,
              exchange: quote.fullExchangeName || quote.exchange || '',
              type: 'equity'
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch quote for ${symbol}:`, error);
        }
        
        // Add delay to avoid rate limiting
        await this.delay(100);
      }
      
      console.log(`✅ Found ${companies.length} top companies`);
      return companies;
    } catch (error) {
      console.error('Failed to fetch top companies by market cap:', error);
      return [];
    }
  }



  /**
   * Deduplicate companies by symbol
   */
  private deduplicateCompanies(companies: CompanySearchResult[]): CompanySearchResult[] {
    const seen = new Set<string>();
    return companies.filter(company => {
      if (seen.has(company.symbol)) {
        return false;
      }
      seen.add(company.symbol);
      return true;
    });
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export a singleton instance
export const yahooFinanceService = new YahooFinanceService();
