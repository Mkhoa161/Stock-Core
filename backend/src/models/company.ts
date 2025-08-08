export interface Company {
  id: number;
  ticker: string;
  name: string;
  sector?: string;
  industry?: string;
  created_at: Date;
  updated_at: Date;
}

export interface StockPrice {
  id: number;
  company_id: number;
  date: Date;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  market_cap?: number;
  created_at: Date;
}

export interface DailySummary {
  id: number;
  company_id: number;
  date: Date;
  price: number;
  day_change: number;
  day_change_percent: number;
  market_cap?: number;
  volume: number;
  created_at: Date;
}

export interface CompanyWithLatestData extends Company {
  latest_price?: number;
  latest_day_change?: number;
  latest_day_change_percent?: number;
  latest_market_cap?: number;
  latest_volume?: number;
}

export interface CreateCompanyInput {
  ticker: string;
  name: string;
  sector?: string;
  industry?: string;
}

export interface CreateStockPriceInput {
  company_id: number;
  date: Date;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  market_cap?: number;
}

export interface CreateDailySummaryInput {
  company_id: number;
  date: Date;
  price: number;
  day_change: number;
  day_change_percent: number;
  market_cap?: number;
  volume: number;
}

// Yahoo Finance API response interfaces
export interface YahooFinanceQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number;
  shortName?: string;
  longName?: string;
}

export interface YahooFinanceChartData {
  timestamp: number[];
  indicators: {
    quote: Array<{
      open: number[];
      high: number[];
      low: number[];
      close: number[];
      volume: number[];
    }>;
  };
}
