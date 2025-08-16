import { DailyDataCollector } from '../lambda/dailyDataCollector';
import * as dotenv from 'dotenv';

dotenv.config();

async function testLambdaSimple() {
  console.log('🧪 Simple Lambda Test (No API Calls)...\n');
  
  try {
    // Create collector instance
    const collector = new DailyDataCollector();
    
    // Test only the scraping step (no API calls)
    console.log('🔍 Testing S&P 500 scraping only...');
    const scraped = await collector.scrapeSP500Companies();
    
    console.log('\n📊 Results:');
    console.log(`✅ Companies scraped: ${scraped}`);
    console.log('✅ Lambda function structure works!');
    
    return { success: true, companiesScraped: scraped };
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testLambdaSimple()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Simple Lambda test passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Simple Lambda test failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Test error:', error);
      process.exit(1);
    });
}

export { testLambdaSimple };
