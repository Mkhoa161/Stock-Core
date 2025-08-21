import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { fmpService } from '../services/fmpService';
import { companyService } from '../services/companyService';
import { historicalDataService } from '../services/historicalDataService';
import { scrapeSP500Companies } from '../scripts/scrapeSP500';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface DailyCollectionResult {
  success: boolean;
  companiesScraped: number;
  companiesUpdated: number;
  historicalDataCollected: number;
  apiCallsUsed: number;
  apiCallsRemaining: number;
  errors: string[];
  timestamp: string;
}

class DailyDataCollector {
  private apiCallCounter = 0;
  private readonly DAILY_LIMIT = 250;
  private readonly errors: string[] = [];

  /**
   * Track API calls made during this execution
   */
  private incrementApiCalls(count: number = 1): void {
    this.apiCallCounter += count;
    console.log(`📊 API calls used: ${this.apiCallCounter}/${this.DAILY_LIMIT}`);
  }

  /**
   * Get remaining API calls for today
   */
  private getRemainingCalls(): number {
    return Math.max(0, this.DAILY_LIMIT - this.apiCallCounter);
  }

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
   * Step 2: Update company profiles and collect current market data for dashboard
   */
  async updateCompanyProfilesAndMarketData(): Promise<number> {
    try {
      console.log('🏢 Step 2: Updating company profiles and collecting market data...');
      
      // Get all companies from database
      const allCompanies = await companyService.getAllCompanies();
      
      // Filter companies that need profile updates (missing sector/industry)
      const companiesNeedingUpdate = allCompanies.filter(company => 
        !company.sector || !company.industry || company.sector === '' || company.industry === ''
      );
      
      console.log(`📊 Found ${companiesNeedingUpdate.length} companies needing profile updates`);
      
      let profilesUpdated = 0;
      let marketDataUpdated = 0;
      
      // Process all companies for market data (dashboard needs current prices, changes, etc.)
      const allTickers = allCompanies.map(c => c.ticker);
      
      // Process in batches of 10 (FMP limit)
      const batchSize = 10;
      for (let i = 0; i < allTickers.length; i += batchSize) {
        const batch = allTickers.slice(i, i + batchSize);
        
        // Check if we have enough API calls
        if (this.getRemainingCalls() < 1) {
          console.log('⚠️ No API calls remaining for market data updates');
          break;
        }
        
        try {
          console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allTickers.length / batchSize)}`);
          
          // Get combined company data (profiles + quotes) using the efficient method
          const combinedData = await fmpService.getCombinedCompanyData(batch);
          this.incrementApiCalls(1);
          
          // Process each company's data
          for (const data of combinedData) {
            try {
              const company = allCompanies.find(c => c.ticker === data.symbol);
              if (!company) continue;
              
              // Update profile if needed
              const needsProfileUpdate = companiesNeedingUpdate.find(c => c.ticker === data.symbol);
              if (needsProfileUpdate && (data.sector || data.industry)) {
                await companyService.updateCompanyProfile(company.id, {
                  sector: data.sector,
                  industry: data.industry,
                  name: data.companyName
                });
                console.log(`✅ Updated profile for ${data.symbol}: ${data.companyName}`);
                profilesUpdated++;
              }
              
              // Update market data for dashboard
              if (data.price && data.price > 0) {
                await companyService.updateCompanyMarketData(company.id, {
                  price: data.price,
                  change: data.change,
                  changePercent: data.changePercent,
                  volume: data.volume,
                  marketCap: data.marketCap
                });
                console.log(`📈 Updated market data for ${data.symbol}: $${data.price} (${data.changePercent}%)`);
                marketDataUpdated++;
              }
              
            } catch (error: any) {
              const errorMsg = `Error processing ${data.symbol}: ${error.message}`;
              console.error(`❌ ${errorMsg}`);
              this.errors.push(errorMsg);
            }
          }
          
          // Add delay between batches
          if (i + batchSize < allTickers.length) {
            await this.delay(1000);
          }
          
        } catch (error: any) {
          const errorMsg = `Error processing batch: ${error.message}`;
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
   * Step 3: Collect historical data for remaining API calls
   */
  async collectHistoricalData(): Promise<number> {
    try {
      console.log('📈 Step 3: Collecting historical data with remaining API calls...');
      
      const remainingCalls = this.getRemainingCalls();
      console.log(`📊 Remaining API calls: ${remainingCalls}`);
      
      if (remainingCalls === 0) {
        console.log('⚠️ No API calls remaining for historical data');
        return 0;
      }
      
      // Get all companies from database
      const allCompanies = await companyService.getAllCompanies();
      
      // Select companies that need historical data (prioritize popular ones)
      const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM'];
      const selectedCompanies = allCompanies.filter(company => 
        popularTickers.includes(company.ticker)
      ).slice(0, remainingCalls);
      
      console.log(`📈 Selected ${selectedCompanies.length} companies for historical data collection`);
      
      let historicalDataCollected = 0;
      
      for (const company of selectedCompanies) {
        try {
          // Check if we still have API calls
          if (this.getRemainingCalls() < 1) {
            console.log('⚠️ No more API calls remaining');
            break;
          }
          
          console.log(`📈 Collecting historical data for ${company.ticker}...`);
          
          // Get historical data (60 days)
          const historicalData = await fmpService.getBulkHistoricalData([company.ticker], 60);
          this.incrementApiCalls(1);
          
          const data = historicalData[company.ticker];
          if (data && data.length > 0) {
            // Store historical data
            await companyService.updateCompanyHistoricalData(company.id, data);
            historicalDataCollected++;
            console.log(`✅ Collected ${data.length} days of historical data for ${company.ticker}`);
          } else {
            console.log(`⚠️ No historical data available for ${company.ticker}`);
          }
          
          // Add delay between requests
          await this.delay(100);
          
        } catch (error: any) {
          const errorMsg = `Error collecting historical data for ${company.ticker}: ${error.message}`;
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
   */
  async execute(): Promise<DailyCollectionResult> {
    console.log('🚀 Starting daily data collection...');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Scrape S&P 500 companies
      const companiesScraped = await this.scrapeSP500Companies();
      
      // Step 2: Update company profiles and market data
      const companiesUpdated = await this.updateCompanyProfilesAndMarketData();
      
      // Step 3: Collect historical data
      const historicalDataCollected = await this.collectHistoricalData();
      
      // Step 4: Clean up old historical data
      await this.cleanupOldHistoricalData();
      
      const executionTime = Date.now() - startTime;
      
      const result: DailyCollectionResult = {
        success: this.errors.length === 0,
        companiesScraped,
        companiesUpdated,
        historicalDataCollected,
        apiCallsUsed: this.apiCallCounter,
        apiCallsRemaining: this.getRemainingCalls(),
        errors: this.errors,
        timestamp: new Date().toISOString()
      };
      
      console.log('🎉 Daily data collection completed!');
      console.log('📊 Summary:', {
        companiesScraped,
        companiesUpdated,
        historicalDataCollected,
        apiCallsUsed: this.apiCallCounter,
        apiCallsRemaining: this.getRemainingCalls(),
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
        apiCallsUsed: this.apiCallCounter,
        apiCallsRemaining: this.getRemainingCalls(),
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
          apiCallsUsed: result.apiCallsUsed,
          apiCallsRemaining: result.apiCallsRemaining
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
