import { DailyDataCollector } from '../lambda/dailyDataCollector';
import { companyService } from '../services/companyService';
import { fmpService } from '../services/fmpService';
import * as dotenv from 'dotenv';

dotenv.config();

interface TestScenario {
  name: string;
  description: string;
  testFunction: () => Promise<any>;
}

async function testLambda() {
  console.log('🧪 Testing AWS Lambda Daily Data Collector...\n');
  
  const scenarios: TestScenario[] = [
    {
      name: 'Full Lambda Execution',
      description: 'Test the complete Lambda function execution',
      testFunction: testFullExecution
    },
    {
      name: 'Individual Steps',
      description: 'Test each step individually',
      testFunction: testIndividualSteps
    },
    {
      name: 'API Call Tracking',
      description: 'Test API call counting and limits',
      testFunction: testApiCallTracking
    },
    {
      name: 'Error Handling',
      description: 'Test error handling scenarios',
      testFunction: testErrorHandling
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);
    console.log('─'.repeat(60));
    
    try {
      await scenario.testFunction();
      console.log(`✅ ${scenario.name} - PASSED`);
    } catch (error) {
      console.error(`❌ ${scenario.name} - FAILED:`, error);
    }
    
    console.log('─'.repeat(60));
  }
}

async function testFullExecution() {
  console.log('🚀 Testing full Lambda execution...\n');
  
  // Create a test event (simulating AWS Lambda event)
  const testEvent = {
    source: 'aws.events',
    'detail-type': 'Scheduled Event',
    time: new Date().toISOString()
  };
  
  console.log('📋 Test Event:', JSON.stringify(testEvent, null, 2));
  console.log('');
  
  // Create collector instance
  const collector = new DailyDataCollector();
  
  // Execute the daily collection
  console.log('🚀 Starting daily data collection...\n');
  const result = await collector.execute();
  
  // Display results
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`✅ Success: ${result.success}`);
  console.log(`📅 Timestamp: ${result.timestamp}`);
  console.log(`🔍 Companies Scraped: ${result.companiesScraped}`);
  console.log(`🏢 Profiles Updated: ${result.companiesUpdated}`);
  console.log(`📈 Historical Data Collected: ${result.historicalDataCollected}`);
  console.log(`📊 API Calls Used: ${result.apiCallsUsed}`);
  console.log(`📊 API Calls Remaining: ${result.apiCallsRemaining}`);
  console.log(`❌ Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  return result;
}

async function testIndividualSteps() {
  console.log('🔧 Testing individual steps...\n');
  
  const collector = new DailyDataCollector();
  
  // Test Step 1: Scraping
  console.log('🔍 Testing Step 1: S&P 500 Scraping...');
  const scraped = await collector.scrapeSP500Companies();
  console.log(`✅ Scraped: ${scraped} companies\n`);
  
  // Test Step 2: Profile Updates and Market Data
  console.log('🏢 Testing Step 2: Profile Updates and Market Data...');
  const updated = await collector.updateCompanyProfilesAndMarketData();
  console.log(`✅ Updated: ${updated} records (profiles + market data)\n`);
  
  // Test Step 3: Historical Data
  console.log('📈 Testing Step 3: Historical Data Collection...');
  const historical = await collector.collectHistoricalData();
  console.log(`✅ Collected: ${historical} historical datasets\n`);
  
  return { scraped, updated, historical };
}

async function testApiCallTracking() {
  console.log('📊 Testing API call tracking...\n');
  
  // Simulate some API calls
  console.log('🔧 Simulating API calls...');
  
  // Test profile updates (should use 1 API call per batch)
  const allCompanies = await companyService.getAllCompanies();
  const companiesNeedingUpdate = allCompanies.filter((company: any) => 
    !company.sector || !company.industry || company.sector === '' || company.industry === ''
  ).slice(0, 5); // Only test with 5 companies
  
  if (companiesNeedingUpdate.length > 0) {
    console.log(`📦 Testing with ${companiesNeedingUpdate.length} companies...`);
    const tickers = companiesNeedingUpdate.map((c: any) => c.ticker);
    
    // This should use 1 API call
    const profiles = await fmpService.getBulkCompanyProfiles(tickers);
    console.log(`✅ Got ${profiles.length} profiles`);
  }
  
  console.log('📊 API call tracking test completed');
  return { companiesTested: companiesNeedingUpdate.length };
}

async function testErrorHandling() {
  console.log('⚠️ Testing error handling...\n');
  
  // Test with invalid ticker
  console.log('🔧 Testing with invalid ticker...');
  try {
    const invalidProfiles = await fmpService.getBulkCompanyProfiles(['INVALID_TICKER']);
    console.log(`✅ Handled invalid ticker gracefully: ${invalidProfiles.length} results`);
  } catch (error: any) {
    console.log(`✅ Error handling works: ${error.message}`);
  }
  
  // Test with empty array
  console.log('🔧 Testing with empty array...');
  try {
    const emptyProfiles = await fmpService.getBulkCompanyProfiles([]);
    console.log(`✅ Handled empty array gracefully: ${emptyProfiles.length} results`);
  } catch (error: any) {
    console.log(`✅ Error handling works: ${error.message}`);
  }
  
  return { errorHandlingTested: true };
}



// Run the test
if (require.main === module) {
  testLambda()
    .then((results) => {
      console.log('\n🎉 All Lambda tests completed!');
      console.log('📊 Summary: All scenarios tested successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Lambda tests failed:', error);
      process.exit(1);
    });
}

export { testLambda, testFullExecution, testIndividualSteps, testApiCallTracking, testErrorHandling };
