import { YahooFinanceQuote, YahooFinanceChartData } from '../models/company';

export class YahooFinanceService {
  private baseUrl = 'https://query1.finance.yahoo.com';

  /**
   * Get real-time quote for a stock
   */
  async getQuote(ticker: string): Promise<YahooFinanceQuote | null> {
    try {
      const url = `${this.baseUrl}/v7/finance/quote?symbols=${ticker.toUpperCase()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      if (!data.quoteResponse || !data.quoteResponse.result || data.quoteResponse.result.length === 0) {
        return null;
      }
      
      const quote = data.quoteResponse.result[0];
      
      return {
        symbol: quote.symbol,
        regularMarketPrice: quote.regularMarketPrice || 0,
        regularMarketChange: quote.regularMarketChange || 0,
        regularMarketChangePercent: quote.regularMarketChangePercent || 0,
        regularMarketVolume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap || 0,
        shortName: quote.shortName,
        longName: quote.longName
      };
    } catch (error) {
      console.error(`Error fetching quote for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get historical chart data for a stock
   */
  async getChartData(ticker: string, days: number = 30): Promise<YahooFinanceChartData | null> {
    try {
      const endDate = Math.floor(Date.now() / 1000);
      const startDate = endDate - (days * 24 * 60 * 60);
      
      const url = `${this.baseUrl}/v8/finance/chart/${ticker.toUpperCase()}?period1=${startDate}&period2=${endDate}&interval=1d`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        return null;
      }
      
      const result = data.chart.result[0];
      
      return {
        timestamp: result.timestamp || [],
        indicators: {
          quote: result.indicators.quote || []
        }
      };
    } catch (error) {
      console.error(`Error fetching chart data for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get multiple quotes at once
   */
  async getMultipleQuotes(tickers: string[]): Promise<YahooFinanceQuote[]> {
    try {
      const symbols = tickers.map(t => t.toUpperCase()).join(',');
      const url = `${this.baseUrl}/v7/finance/quote?symbols=${symbols}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      if (!data.quoteResponse || !data.quoteResponse.result) {
        return [];
      }
      
      return data.quoteResponse.result.map((quote: any) => ({
        symbol: quote.symbol,
        regularMarketPrice: quote.regularMarketPrice || 0,
        regularMarketChange: quote.regularMarketChange || 0,
        regularMarketChangePercent: quote.regularMarketChangePercent || 0,
        regularMarketVolume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap || 0,
        shortName: quote.shortName,
        longName: quote.longName
      }));
    } catch (error) {
      console.error('Error fetching multiple quotes:', error);
      return [];
    }
  }

  /**
   * Search for companies by ticker or name
   */
  async searchCompanies(query: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      if (!data.quotes) {
        return [];
      }
      
      return data.quotes.map((quote: any) => ({
        symbol: quote.symbol,
        shortName: quote.shortname,
        longName: quote.longname,
        exchange: quote.exchange,
        type: quote.quoteType
      }));
    } catch (error) {
      console.error('Error searching companies:', error);
      return [];
    }
  }
}

export const yahooFinanceService = new YahooFinanceService();
