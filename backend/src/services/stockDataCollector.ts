import { companyService } from './companyService';


export interface CollectionResult {
  success: boolean;
  companiesProcessed: number;
  companiesFailed: string[];
  totalRecordsCreated: number;
  errors: string[];
}

export interface CompanyToProcess {
  ticker: string;
  name?: string;
  sector?: string;
  industry?: string;
}

export class StockDataCollector {
  // Fallback companies if dynamic discovery fails
  private fallbackCompanies: CompanyToProcess[] = [
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
    { ticker: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Cyclical', industry: 'Internet Retail' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Content & Information' },
    { ticker: 'TSLA', name: 'Tesla, Inc.', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' }
  ];

  /**
   * Discover companies dynamically from various sources
   * @param limit Maximum number of companies to discover
   */
  async discoverCompanies(limit: number = 100): Promise<CompanyToProcess[]> {
    try {
      console.log('🔍 Discovering companies dynamically...');
      
      // Import FMP service
      const { fmpService } = await import('./fmpService.js');
      
      const discoveredCompanies: CompanyToProcess[] = [];
      
      // Use predefined S&P 500 companies for efficiency
      console.log('🏆 Using predefined S&P 500 companies...');
      const sp500Symbols = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.A', 'UNH', 'JNJ',
        'V', 'PG', 'HD', 'MA', 'DIS', 'PYPL', 'BAC', 'ADBE', 'CRM', 'NFLX'
      ];
      const selectedSymbols = sp500Symbols.slice(0, limit);
      
      discoveredCompanies.push(...selectedSymbols.map(ticker => ({
        ticker,
        name: ticker, // Will be updated with real name from FMP
        sector: '',
        industry: ''
      })));
      
      console.log(`✅ Discovered ${discoveredCompanies.length} companies`);
      return discoveredCompanies;
      
    } catch (error) {
      console.error('❌ Company discovery failed, using fallback companies:', error);
      return this.fallbackCompanies;
    }
  }

  /**
   * Initialize database with dynamically discovered companies
   * @param limit Maximum number of companies to discover
   */
  async initializeWithDiscoveredCompanies(limit: number = 100): Promise<CollectionResult> {
    console.log('🚀 Initializing database with dynamically discovered companies...');
    const discoveredCompanies = await this.discoverCompanies(limit);
    return this.collectAllStockData(discoveredCompanies);
  }

  /**
   * Main function called by AWS Lambda every 24 hours
   * Collects stock data for all companies and writes to RDS
   * @param companiesToProcess Optional list of companies to process. If not provided and database is empty, will discover companies dynamically.
   */
  async collectAllStockData(companiesToProcess?: CompanyToProcess[]): Promise<CollectionResult> {
    const result: CollectionResult = {
      success: true,
      companiesProcessed: 0,
      companiesFailed: [],
      totalRecordsCreated: 0,
      errors: []
    };

    try {
      console.log('🚀 Starting daily stock data collection...');
      
      // Get all companies from database
      let companies = await companyService.getAllCompaniesWithLatestData();
      console.log(`📊 Found ${companies.length} companies in database`);

      // If no companies in database and no companies provided, discover companies dynamically
      if (companies.length === 0 && !companiesToProcess) {
        console.log('⚠️ No companies found in database, discovering companies dynamically...');
        companiesToProcess = await this.discoverCompanies(50); // Start with 50 companies
      }

      // If we have companies to process but they don't exist in database, create them first
      if (companiesToProcess && companiesToProcess.length > 0) {
        console.log(`🏗️ Setting up ${companiesToProcess.length} companies for processing...`);
        
        for (const companyData of companiesToProcess) {
          try {
            // Check if company already exists
            let company = await companyService.getCompanyByTicker(companyData.ticker);
            
            if (!company) {
              console.log(`🏢 Creating new company: ${companyData.ticker}`);
              company = await companyService.createCompany({
                ticker: companyData.ticker,
                name: companyData.name || companyData.ticker,
                sector: companyData.sector || '',
                industry: companyData.industry || ''
              });
              console.log(`✅ Created company: ${company.ticker}`);
            } else {
              console.log(`⏭️ Company ${companyData.ticker} already exists`);
            }
          } catch (error: any) {
            const errorMsg = `Failed to create company ${companyData.ticker}: ${error.message}`;
            result.errors.push(errorMsg);
            console.error(errorMsg);
          }
        }

        // Refresh companies list after creating new ones
        companies = await companyService.getAllCompaniesWithLatestData();
        console.log(`📊 Now have ${companies.length} companies to process`);
      }

      if (companies.length === 0) {
        console.log('⚠️ Still no companies available for processing');
        return result;
      }

      // Process each company
      for (const company of companies) {
        try {
          console.log(`📈 Processing ${company.ticker}...`);
          
          const success = await this.collectStockDataForCompany(company.ticker);
          
          if (success) {
            result.companiesProcessed++;
            result.totalRecordsCreated += 2; // Stock price + daily summary
            console.log(`✅ Successfully processed ${company.ticker}`);
          } else {
            result.companiesFailed.push(company.ticker);
            result.errors.push(`Failed to process ${company.ticker}`);
            console.log(`❌ Failed to process ${company.ticker}`);
          }

          // Add delay to avoid rate limiting
          await this.delay(1000);
          
        } catch (error) {
          const errorMsg = `Error processing ${company.ticker}: ${error}`;
          result.errors.push(errorMsg);
          result.companiesFailed.push(company.ticker);
          console.error(errorMsg);
        }
      }

      console.log(`🎉 Daily data collection completed! Processed: ${result.companiesProcessed}, Failed: ${result.companiesFailed.length}`);
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Fatal error during data collection: ${error}`);
      console.error('❌ Fatal error during data collection:', error);
    }

    return result;
  }

  /**
   * Initialize database with specific companies and collect their data
   * Useful for first-time setup or adding new companies
   */
  async initializeWithCompanies(companies: CompanyToProcess[]): Promise<CollectionResult> {
    console.log('🚀 Initializing database with companies and collecting initial data...');
    return this.collectAllStockData(companies);
  }

  /**
   * Initialize database with default companies and collect their data
   * Useful for first-time setup
   */
  async initializeWithDefaultCompanies(): Promise<CollectionResult> {
    console.log('🚀 Initializing database with default companies and collecting initial data...');
    return this.collectAllStockData(this.fallbackCompanies);
  }

  /**
   * Get the list of fallback companies
   */
  getFallbackCompanies(): CompanyToProcess[] {
    return [...this.fallbackCompanies]; // Return a copy to prevent external modification
  }

  /**
   * Add a company to the fallback companies list
   */
  addFallbackCompany(company: CompanyToProcess): void {
    // Check if company already exists
    const exists = this.fallbackCompanies.find(c => c.ticker === company.ticker);
    if (!exists) {
      this.fallbackCompanies.push(company);
      console.log(`✅ Added ${company.ticker} to fallback companies list`);
    } else {
      console.log(`⏭️ Company ${company.ticker} already in fallback companies list`);
    }
  }

  /**
   * Remove a company from the fallback companies list
   */
  removeFallbackCompany(ticker: string): boolean {
    const index = this.fallbackCompanies.findIndex(c => c.ticker === ticker);
    if (index !== -1) {
      this.fallbackCompanies.splice(index, 1);
      console.log(`✅ Removed ${ticker} from fallback companies list`);
      return true;
    }
    console.log(`⚠️ Company ${ticker} not found in fallback companies list`);
    return false;
  }

  /**
   * Deduplicate companies by ticker
   */
  private deduplicateCompanies(companies: CompanyToProcess[]): CompanyToProcess[] {
    const seen = new Set<string>();
    return companies.filter(company => {
      if (seen.has(company.ticker)) {
        return false;
      }
      seen.add(company.ticker);
      return true;
    });
  }

  /**
   * Collect stock data for a specific company
   */
  private async collectStockDataForCompany(ticker: string): Promise<boolean> {
    try {
      // Import FMP service
      const { fmpService } = await import('./fmpService.js');
      
      // Get combined company data from FMP
      const combinedData = await fmpService.getCombinedCompanyData([ticker]);
      const companyData = combinedData[0];
      if (!companyData) {
        console.warn(`⚠️ No data available for ${ticker}`);
        return false;
      }

      // Get or create company
      let company = await companyService.getCompanyByTicker(ticker);
      if (!company) {
        console.log(`🏢 Creating new company: ${ticker}`);
        company = await companyService.createCompany({
          ticker: companyData.symbol,
          name: companyData.companyName,
          sector: companyData.sector,
          industry: companyData.industry
        });
      }

      if (!company) {
        throw new Error(`Failed to create or retrieve company: ${ticker}`);
      }

      // Get historical chart data for the last 30 days
      const historicalData = await fmpService.getBulkHistoricalData([ticker], 30);
      const chartData = historicalData[ticker];
      if (!chartData || chartData.length === 0) {
        console.warn(`⚠️ No chart data available for ${ticker}`);
        return false;
      }

      let recordsCreated = 0;

      // Process each day's data
      for (let i = 0; i < chartData.length; i++) {
        const dayData = chartData[i];
        if (!dayData) continue;

        const date = new Date(dayData.date);
        const open = dayData.open;
        const high = dayData.high;
        const low = dayData.low;
        const close = dayData.close;
        const volume = dayData.volume;

        if (open && high && low && close) {
          try {
            // Create stock price record
            await companyService.createStockPrice({
              company_id: company.id,
              date,
              open_price: open,
              high_price: high,
              low_price: low,
              close_price: close,
              volume,
              market_cap: companyData.marketCap || 0
            });

            // Create daily summary if we have previous day's data
            if (i > 0) {
              const previousClose = chartData[i - 1]?.close || close;
              const dayChange = close - previousClose;
              const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;

              await companyService.createDailySummary({
                company_id: company.id,
                date,
                price: close,
                day_change: parseFloat(dayChange.toFixed(2)),
                day_change_percent: parseFloat(dayChangePercent.toFixed(2)),
                market_cap: companyData.marketCap || 0,
                volume
              });
            }

            recordsCreated++;
          } catch (error: any) {
            // Skip if record already exists (unique constraint)
            if (error.message?.includes('UNIQUE constraint failed') || error.message?.includes('duplicate key')) {
              console.log(`⏭️ Data already exists for ${ticker} on ${date.toISOString().split('T')[0]}`);
            } else {
              throw error;
            }
          }
        }
      }

      console.log(`📊 Created ${recordsCreated} records for ${ticker}`);
      return recordsCreated > 0;

    } catch (error) {
      console.error(`❌ Error collecting data for ${ticker}:`, error);
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

export const stockDataCollector = new StockDataCollector();
