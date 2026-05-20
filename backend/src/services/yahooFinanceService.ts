import yahooFinance from 'yahoo-finance2';

export interface StockQuote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
}

export interface HistoricalData {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: number;
  volume: number;
  change: number;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;
const BATCH_SIZE = 50;

// YF-01: single shared instance with concurrency cap
yahooFinance.setGlobalConfig({ queue: { concurrency: 5 } });

export class YahooFinanceService {
  /**
   * Retry wrapper with exponential backoff for Yahoo Finance rate limits.
   * Retries on HTTPError code 429; skips immediately on 404; re-throws other errors.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = MAX_RETRIES,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const HTTPError = yahooFinance.errors['HTTPError'];
      if (error instanceof HTTPError) {
        if ((error as any).code === 404) {
          console.warn(`⚠️ 404 — delisted ticker, skipping`);
          throw error;
        }
        if ((error as any).code === 429 && retries > 0) {
          const backoffMs = BASE_DELAY_MS * (MAX_RETRIES - retries + 2);
          console.warn(`⚠️ 429 rate limited — retry in ${backoffMs}ms (${retries} left)`);
          await this.delay(backoffMs);
          return this.withRetry(fn, retries - 1);
        }
      }
      throw error;
    }
  }

  /**
   * Get quotes for multiple symbols via batched array-form quote() calls.
   * Returns null for missing fields instead of 0.
   */
  async getBulkQuotes(symbols: string[]): Promise<StockQuote[]> {
    if (symbols.length === 0) return [];

    const results: StockQuote[] = [];

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      try {
        const quotes = (await yahooFinance.quote(batch)) as any[];
        for (const q of quotes) {
          results.push({
            symbol: q.symbol,
            price: q.regularMarketPrice ?? null,
            change: q.regularMarketChange ?? null,
            // changePercent unit per 02-WAVE0-FINDINGS.md: PERCENT (direct passthrough, no ×100)
            changePercent: q.regularMarketChangePercent ?? null,
            volume: q.regularMarketVolume ?? null,
            marketCap: q.marketCap ?? null,
          });
        }
      } catch (error) {
        console.error(`❌ Batch quote failed for ${batch.join(',')}:`, error);
        // skip batch, continue
      }
      if (i + BATCH_SIZE < symbols.length) {
        await this.delay(2000); // 2s between batches only (YF-09)
      }
    }

    console.log(`Got quotes for ${results.length}/${symbols.length} symbols`);
    return results;
  }

  /**
   * Get historical price data for multiple symbols using chart() instead of deprecated historical().
   * Preserves null fields instead of coercing to 0.
   */
  async getBulkHistoricalData(
    symbols: string[],
    days: number = 60,
    fromDate?: string,
    toDate?: string,
  ): Promise<Record<string, HistoricalData[]>> {
    if (symbols.length === 0) return {};

    const result: Record<string, HistoricalData[]> = {};
    const endDate = toDate ? new Date(toDate) : new Date();
    const startDate = fromDate
      ? new Date(fromDate)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - days);
          return d;
        })();

    for (const ticker of symbols) {
      try {
        const chartResult = await this.withRetry(() =>
          yahooFinance.chart(ticker, {
            period1: startDate, // Date object — not a string number (RESEARCH Pitfall 2)
            period2: endDate,
            interval: '1d',
            return: 'array',
          }),
        );
        result[ticker] = (chartResult.quotes as any[])
          .filter((q): q is typeof q & { date: Date } => q.date != null)
          .map((q) => ({
            date: q.date.toISOString().slice(0, 10),
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume,
          }));
        console.log(`Got ${result[ticker]!.length} days of historical data for ${ticker}`);
      } catch (error) {
        console.error(`❌ chart() failed for ${ticker}:`, error);
        result[ticker] = [];
      }
    }

    return result;
  }

  /**
   * Get company profiles for multiple symbols using quoteSummary
   */
  async getBulkCompanyProfiles(symbols: string[]): Promise<CompanyProfile[]> {
    if (symbols.length === 0) return [];

    const profiles: CompanyProfile[] = [];

    for (const symbol of symbols) {
      try {
        const summary = await this.withRetry(() =>
          yahooFinance.quoteSummary(symbol, { modules: ['assetProfile', 'price'] }),
        );

        const assetProfile = summary.assetProfile;
        const price = summary.price;

        profiles.push({
          symbol,
          companyName: price?.shortName ?? price?.longName ?? symbol,
          sector: assetProfile?.sector ?? '',
          industry: assetProfile?.industry ?? '',
          price: price?.regularMarketPrice ?? 0,
          marketCap: price?.marketCap ?? 0,
          volume: price?.regularMarketVolume ?? 0,
          change: price?.regularMarketChange ?? 0,
        });
      } catch (error) {
        console.error(`Error fetching profile for ${symbol}:`, error);
      }
      await this.delay(BASE_DELAY_MS);
    }

    console.log(`Got company profiles for ${profiles.length}/${symbols.length} symbols`);
    return profiles;
  }

  /**
   * Get combined company data (profile + live quote) efficiently.
   * Uses quoteSummary which returns both in a single call per symbol.
   */
  async getCombinedCompanyData(symbols: string[]): Promise<
    Array<{
      symbol: string;
      companyName: string;
      sector: string;
      industry: string;
      price: number;
      change: number;
      changePercent: number;
      volume: number;
      marketCap: number;
    }>
  > {
    if (symbols.length === 0) return [];

    const combined: Array<{
      symbol: string;
      companyName: string;
      sector: string;
      industry: string;
      price: number;
      change: number;
      changePercent: number;
      volume: number;
      marketCap: number;
    }> = [];

    for (const symbol of symbols) {
      try {
        const summary = await this.withRetry(() =>
          yahooFinance.quoteSummary(symbol, { modules: ['assetProfile', 'price'] }),
        );

        const profile = summary.assetProfile;
        const price = summary.price;

        combined.push({
          symbol,
          companyName: price?.shortName ?? price?.longName ?? symbol,
          sector: profile?.sector ?? '',
          industry: profile?.industry ?? '',
          price: price?.regularMarketPrice ?? 0,
          change: price?.regularMarketChange ?? 0,
          // changePercent unit per 02-WAVE0-FINDINGS.md: PERCENT (remove ×100 multiplier)
          changePercent: price?.regularMarketChangePercent ?? 0,
          volume: price?.regularMarketVolume ?? 0,
          marketCap: price?.marketCap ?? 0,
        });
      } catch (error) {
        console.error(`Error fetching combined data for ${symbol}:`, error);
      }
      await this.delay(BASE_DELAY_MS);
    }

    console.log(`Got combined data for ${combined.length}/${symbols.length} symbols`);
    return combined;
  }

  /**
   * Health check — try fetching a single well-known ticker
   */
  async healthCheck(): Promise<boolean> {
    try {
      const quote = await yahooFinance.quote('AAPL');
      return !!quote && ((quote as any).regularMarketPrice ?? 0) > 0;
    } catch (error) {
      console.error('Yahoo Finance health check failed:', error);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const yahooFinanceService = new YahooFinanceService();
