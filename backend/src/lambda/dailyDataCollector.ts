import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { yahooFinanceService } from '../services/yahooFinanceService';
import { companyService } from '../services/companyService';
import { historicalDataService } from '../services/historicalDataService';
import { scrapeSP500Companies } from '../scripts/scrapeSP500';
import dbInterface from '../config/database';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface DailyCollectionResult {
  success: boolean;
  companiesScraped: number;
  companiesUpdated: number;
  historicalDataCollected: number;
  errors: string[];
  timestamp: string;
}

class DailyDataCollector {
  private readonly errors: string[] = [];

  /**
   * Step 1: Scrape S&P 500 companies from Wikipedia
   */
  async scrapeSP500Companies(): Promise<number> {
    try {
      console.log('🔍 Step 1: Scraping S&P 500 companies from Wikipedia...');

      const scrapedCompanies = await scrapeSP500Companies();
      let companiesAdded = 0;

      for (const company of scrapedCompanies) {
        try {
          // Check if company already exists
          const existing = await companyService.getCompanyByTicker(company.ticker);

          if (!existing) {
            await companyService.createCompany({
              ticker: company.ticker,
              name: company.name,
              sector: '',
              industry: ''
            });
            companiesAdded++;
            console.log(`✅ Added: ${company.ticker} - ${company.name}`);
          } else {
            console.log(`⏭️ Skipped (exists): ${company.ticker} - ${company.name}`);
          }
        } catch (error: any) {
          const errorMsg = `Error processing ${company.ticker}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          this.errors.push(errorMsg);
        }
      }

      console.log(`✅ Step 1 completed: ${companiesAdded} new companies added`);
      return companiesAdded;

    } catch (error: any) {
      const errorMsg = `Failed to scrape S&P 500: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.errors.push(errorMsg);
      return 0;
    }
  }

  /**
   * Returns tickers with missing or empty sector/industry (YF-04).
   * Used by Step 2 to limit profile fetching to stale companies only.
   */
  private async getStaleProfileTickers(): Promise<string[]> {
    const result = await dbInterface.query(
      `SELECT ticker FROM companies WHERE sector IS NULL OR sector = '' OR industry IS NULL OR industry = ''`,
    );
    return result.rows.map((r: { ticker: string }) => r.ticker);
  }

  /**
   * Returns tickers whose newest stock_prices row is missing or older than 7 days (YF-05).
   * Used by Step 3 to limit historical collection to stale companies only.
   */
  private async getStaleHistoricalTickers(): Promise<string[]> {
    const result = await dbInterface.query(
      `SELECT c.ticker
       FROM companies c
       LEFT JOIN (
         SELECT company_id, MAX(date) AS max_date
         FROM stock_prices
         GROUP BY company_id
       ) sp ON c.id = sp.company_id
       WHERE sp.max_date IS NULL OR sp.max_date < NOW() - INTERVAL '7 days'
       ORDER BY c.ticker`,
    );
    return result.rows.map((r: { ticker: string }) => r.ticker);
  }

  /**
   * Step 2: Update company profiles (stale-only) and collect current market data (all tickers).
   *
   * Profile fetch: only for tickers returned by getStaleProfileTickers() via getBulkCompanyProfiles.
   * Market data fetch: all tickers via batched getBulkQuotes (one call per 50 symbols, 2s inter-batch
   * gap inside the service). The per-symbol getCombinedCompanyData loop and the 5s inter-batch
   * delay (double-delay YF-09) are both removed.
   */
  async updateCompanyProfilesAndMarketData(): Promise<number> {
    try {
      console.log('🏢 Step 2: Updating company profiles and collecting market data...');

      const allCompanies = await companyService.getAllCompanies();
      const allTickers = allCompanies.map(c => c.ticker);

      let profilesUpdated = 0;
      let marketDataUpdated = 0;

      // --- Profile fetch: stale-only (YF-04) ---
      const staleTickers = await this.getStaleProfileTickers();
      console.log(`📊 Found ${staleTickers.length} companies needing profile updates`);

      if (staleTickers.length > 0) {
        const profiles = await yahooFinanceService.getBulkCompanyProfiles(staleTickers);
        for (const profile of profiles) {
          try {
            const company = allCompanies.find(c => c.ticker === profile.symbol);
            if (!company) continue;

            if (profile.sector || profile.industry) {
              await companyService.updateCompanyProfile(company.id, {
                sector: profile.sector,
                industry: profile.industry,
                name: profile.companyName
              });
              console.log(`✅ Updated profile for ${profile.symbol}: ${profile.companyName}`);
              profilesUpdated++;
            }
          } catch (error: any) {
            const errorMsg = `Error updating profile for ${profile.symbol}: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            this.errors.push(errorMsg);
          }
        }
      }

      // --- Market data fetch: all tickers via getBulkQuotes (YF-09 double-delay removed) ---
      console.log(`📈 Fetching market data for all ${allTickers.length} tickers via batched getBulkQuotes...`);
      const quotes = await yahooFinanceService.getBulkQuotes(allTickers);

      for (const quote of quotes) {
        try {
          // T-02-10: skip the write entirely when price is null — do not zero-fill
          if (quote.price == null) continue;

          const company = allCompanies.find(c => c.ticker === quote.symbol);
          if (!company) continue;

          await companyService.updateCompanyMarketData(company.id, {
            price: quote.price,
            change: quote.change ?? 0,
            changePercent: quote.changePercent ?? 0,
            volume: quote.volume ?? 0,
            marketCap: quote.marketCap ?? 0
          });
          console.log(`📈 Updated market data for ${quote.symbol}: $${quote.price} (${quote.changePercent}%)`);
          marketDataUpdated++;
        } catch (error: any) {
          const errorMsg = `Error processing market data for ${quote.symbol}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          this.errors.push(errorMsg);
        }
      }

      console.log(`✅ Step 2 completed: ${profilesUpdated} profiles updated, ${marketDataUpdated} market data records updated`);
      return profilesUpdated + marketDataUpdated;

    } catch (error: any) {
      const errorMsg = `Failed to update company profiles and market data: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.errors.push(errorMsg);
      return 0;
    }
  }

  /**
   * Step 3: Collect historical data for stale tickers only (YF-05).
   * Sources tickers from getStaleHistoricalTickers() — companies with missing or >7-day-old data.
   * Uses 365-day retention to match Phase 1 database cleanup window.
   */
  async collectHistoricalData(): Promise<number> {
    try {
      console.log('📈 Step 3: Collecting historical data...');

      const staleTickers = await this.getStaleHistoricalTickers();

      if (staleTickers.length === 0) {
        console.log('✅ Step 3: No stale historical data — all tickers up to date, skipping.');
        return 0;
      }

      console.log(`📈 Found ${staleTickers.length} companies needing historical data collection`);

      // Cache company list once for id lookup
      const allCompanies = await companyService.getAllCompanies();

      let historicalDataCollected = 0;

      for (const ticker of staleTickers) {
        try {
          const company = allCompanies.find(c => c.ticker === ticker);
          if (!company) {
            console.log(`⚠️ Company not found in DB for ticker ${ticker}, skipping`);
            continue;
          }

          console.log(`📈 Collecting historical data for ${ticker}...`);

          // 365-day retention to match Phase 1 cleanup window (not the old hardcoded 60)
          const historicalData = await yahooFinanceService.getBulkHistoricalData([ticker], 365);

          const data = historicalData[ticker];
          if (data && data.length > 0) {
            await companyService.updateCompanyHistoricalData(company.id, data);
            historicalDataCollected++;
            console.log(`✅ Collected ${data.length} days of historical data for ${ticker}`);
          } else {
            console.log(`⚠️ No historical data available for ${ticker}`);
          }

        } catch (error: any) {
          const errorMsg = `Error collecting historical data for ${ticker}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          this.errors.push(errorMsg);
        }
      }

      console.log(`✅ Step 3 completed: ${historicalDataCollected} companies updated with historical data`);
      return historicalDataCollected;

    } catch (error: any) {
      const errorMsg = `Failed to collect historical data: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.errors.push(errorMsg);
      return 0;
    }
  }

  /**
   * Main execution function
   *
   * Timing budget (YF-08): This pipeline stays well within the 15-minute Lambda timeout because:
   *   (a) Market data (Step 2) uses one batched getBulkQuotes call per 50 tickers with a single 2s
   *       inter-batch gap — 500 tickers = 10 batches × ~1s HTTP + 9 × 2s gaps ≈ 28s.
   *   (b) The per-symbol 1.5s loop (getCombinedCompanyData) is removed.
   *   (c) The 5s inter-batch delay (YF-09 double-delay) is removed.
   *   (d) Profile and historical collection run only for stale companies (YF-04/YF-05), not all 500.
   *   (e) Historical fetches share the concurrency-5 queue from setGlobalConfig — no extra sleeps.
   *
   * Manual timing measurement: run `npm run test:lambda` with a warm DB (all 500 tickers present,
   * historical data <7 days old) and confirm total duration is under 90s. On a cold DB (no data)
   * confirm under 6 minutes. See VALIDATION.md Manual-Only Verifications (YF-08).
   */
  async execute(): Promise<DailyCollectionResult> {
    console.log('🚀 Starting daily data collection...');
    console.log(`📅 Date: ${new Date().toISOString()}`);

    const startTime = Date.now();

    try {
      // Step 1: Scrape S&P 500 companies
      const companiesScraped = await this.scrapeSP500Companies();

      // Step 2: Update company profiles (stale-only) and market data (all tickers, batched)
      const companiesUpdated = await this.updateCompanyProfilesAndMarketData();

      // Step 3: Collect historical data (stale-only, >7 days old or missing)
      const historicalDataCollected = await this.collectHistoricalData();

      // Step 4: Clean up old historical data
      await this.cleanupOldHistoricalData();

      const executionTime = Date.now() - startTime;

      const result: DailyCollectionResult = {
        success: this.errors.length === 0,
        companiesScraped,
        companiesUpdated,
        historicalDataCollected,
        errors: this.errors,
        timestamp: new Date().toISOString()
      };

      console.log('🎉 Daily data collection completed!');
      console.log('📊 Summary:', {
        companiesScraped,
        companiesUpdated,
        historicalDataCollected,
        executionTime: `${executionTime}ms`,
        errors: this.errors.length
      });

      return result;

    } catch (error: any) {
      const errorMsg = `Daily collection failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.errors.push(errorMsg);

      return {
        success: false,
        companiesScraped: 0,
        companiesUpdated: 0,
        historicalDataCollected: 0,
        errors: this.errors,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Step 4: Clean up old historical data
   */
  async cleanupOldHistoricalData(): Promise<void> {
    try {
      console.log('🧹 Step 4: Cleaning up old historical data...');

      await historicalDataService.cleanupOldHistoricalData();

      console.log('✅ Step 4 completed: Old historical data cleaned up');

    } catch (error: any) {
      const errorMsg = `Failed to cleanup old historical data: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.errors.push(errorMsg);
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * AWS Lambda handler function
 */
export const handler = async (
  event: APIGatewayProxyEvent | any,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('🚀 Lambda function started:', new Date().toISOString());
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Check if this is a scheduled event or manual invocation
    const isScheduledEvent = event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event';

    if (isScheduledEvent) {
      console.log('📅 Processing scheduled daily data collection event (24-hour trigger)');
    } else {
      console.log('🔧 Processing manual data collection request');
    }

    // Execute daily data collection
    const collector = new DailyDataCollector();
    const result = await collector.execute();

    const response = {
      statusCode: result.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        success: result.success,
        message: result.success
          ? 'Daily data collection completed successfully'
          : 'Daily data collection completed with errors',
        timestamp: result.timestamp,
        summary: {
          companiesScraped: result.companiesScraped,
          companiesUpdated: result.companiesUpdated,
          historicalDataCollected: result.historicalDataCollected,
        },
        errors: result.errors.length > 0 ? result.errors : undefined
      })
    };

    console.log('✅ Lambda function completed successfully');
    console.log('Response:', JSON.stringify(response, null, 2));

    return response;

  } catch (error) {
    console.error('❌ Lambda function failed:', error);

    const errorResponse = {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Daily data collection failed',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };

    return errorResponse;
  }
};

// Export the class for local testing
export { DailyDataCollector };
