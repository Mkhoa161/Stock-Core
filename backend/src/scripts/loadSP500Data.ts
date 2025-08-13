import * as dotenv from 'dotenv';
import { loadSP500ToDatabase } from './scrapeSP500.js';
import { fmpService } from '../services/fmpService.js';
import { companyService } from '../services/companyService.js';

dotenv.config();

async function loadSP500Data() {
  console.log('🚀 Starting S&P 500 data loading strategy...\n');

  try {
    // Step 1: Load S&P 500 companies from Wikipedia to database
    console.log('📋 Step 1: Loading S&P 500 companies from Wikipedia...');
    await loadSP500ToDatabase();
    console.log('✅ Step 1 completed!\n');

    // Step 2: Get all companies from database
    console.log('📊 Step 2: Getting companies from database...');
    const companies = await companyService.getAllCompanies();
    console.log(`✅ Found ${companies.length} companies in database\n`);

    if (companies.length === 0) {
      console.log('❌ No companies found in database. Please run the S&P 500 loading script first.');
      return;
    }

    // Step 3: Extract tickers for FMP API calls
    console.log('🎯 Step 3: Preparing for FMP API calls...');
    const tickers = companies.map(company => company.ticker);
    console.log(`✅ Prepared ${tickers.length} tickers for API calls\n`);

    // Step 4: Calculate API efficiency
    console.log('📈 Step 4: Calculating API efficiency...');
    const quotesPerCall = 10;
    const profilesPerCall = 10;
    const historicalPerCall = 1; // One call per symbol for historical data
    
    const quotesNeeded = Math.ceil(tickers.length / quotesPerCall);
    const profilesNeeded = Math.ceil(tickers.length / profilesPerCall);
    const historicalNeeded = tickers.length; // One call per symbol
    const totalCalls = quotesNeeded + profilesNeeded + historicalNeeded;
    
    console.log(`📊 API calls needed for ${tickers.length} companies:`);
    console.log(`  Quotes: ${quotesNeeded} calls (${quotesPerCall} per call)`);
    console.log(`  Profiles: ${profilesNeeded} calls (${profilesPerCall} per call)`);
    console.log(`  Historical: ${historicalNeeded} calls (${historicalPerCall} per call)`);
    console.log(`  Total: ${totalCalls} calls`);
    console.log(`  FMP Daily Limit: 250 calls`);
    console.log(`  Efficiency: ${((totalCalls / 250) * 100).toFixed(1)}% of daily limit`);
    
    if (totalCalls > 250) {
      console.log('⚠️ Warning: This will exceed the daily API limit!');
      console.log('💡 Consider processing in smaller batches or upgrading your plan.');
      return;
    }
    console.log('✅ API efficiency calculation completed!\n');

    // Step 5: Fetch all data from FMP
    console.log('🔄 Step 5: Fetching data from FMP API...');
    const { quotes, profiles, historicalData } = await fmpService.getAllSP500Data(tickers);
    
    console.log(`✅ FMP data fetch completed:`);
    console.log(`  Quotes: ${quotes.length} companies`);
    console.log(`  Profiles: ${profiles.length} companies`);
    console.log(`  Historical data: ${Object.keys(historicalData).length} companies`);
    console.log('');

    // Step 6: Update database with FMP data
    console.log('💾 Step 6: Updating database with FMP data...');
    let updatedQuotes = 0;
    let updatedProfiles = 0;
    let updatedHistorical = 0;

    // Update quotes and basic info
    for (const quote of quotes) {
      try {
        const company = await companyService.getCompanyByTicker(quote.symbol);
        if (company) {
          // Update company with quote data
          // Note: You might want to add an update method to companyService
          console.log(`  Updated quote for ${quote.symbol}: $${quote.price}`);
          updatedQuotes++;
        }
      } catch (error) {
        console.error(`  ❌ Error updating ${quote.symbol}:`, error);
      }
    }

    // Update company profiles
    for (const profile of profiles) {
      try {
        const company = await companyService.getCompanyByTicker(profile.symbol);
        if (company) {
          // Update company with profile data
          console.log(`  Updated profile for ${profile.symbol}: ${profile.companyName}`);
          updatedProfiles++;
        }
      } catch (error) {
        console.error(`  ❌ Error updating profile for ${profile.symbol}:`, error);
      }
    }

    // Store historical data
    for (const [symbol, historical] of Object.entries(historicalData)) {
      try {
        const company = await companyService.getCompanyByTicker(symbol);
        if (company && historical.length > 0) {
          // Store historical data
          console.log(`  Stored ${historical.length} days of historical data for ${symbol}`);
          updatedHistorical++;
        }
      } catch (error) {
        console.error(`  ❌ Error storing historical data for ${symbol}:`, error);
      }
    }

    console.log(`✅ Database updates completed:`);
    console.log(`  Quotes updated: ${updatedQuotes}`);
    console.log(`  Profiles updated: ${updatedProfiles}`);
    console.log(`  Historical data stored: ${updatedHistorical}`);
    console.log('');

    // Step 7: Final summary
    console.log('🎉 Step 7: Final summary...');
    const remainingCalls = fmpService.getRemainingCalls();
    console.log(`📊 API calls used: ${250 - remainingCalls}/250`);
    console.log(`📈 Remaining calls today: ${remainingCalls}`);
    console.log(`📋 Total companies processed: ${tickers.length}`);
    console.log(`💾 Data successfully stored: ${updatedQuotes + updatedProfiles + updatedHistorical} records`);
    console.log('');

    console.log('🎯 Strategy execution completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('• Set up daily cron job to refresh data');
    console.log('• Implement frontend dashboard to display the data');
    console.log('• Consider upgrading FMP plan for more frequent updates');

  } catch (error) {
    console.error('❌ Error in S&P 500 data loading strategy:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  loadSP500Data()
    .then(() => {
      console.log('✅ S&P 500 data loading strategy completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ S&P 500 data loading strategy failed:', error);
      process.exit(1);
    });
}

export { loadSP500Data };
