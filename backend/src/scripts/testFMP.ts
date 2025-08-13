import { fmpService } from '../services/fmpService';
import * as dotenv from 'dotenv';
dotenv.config();

async function testCombinedData() {
  console.log('🔗 Testing Combined Company Data Method...\n');
  
  try {
    const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];
    console.log(`📊 Testing with symbols: ${testSymbols.join(', ')}`);
    
    const combinedData = await fmpService.getCombinedCompanyData(testSymbols);
    
    console.log(`✅ Got combined data for ${combinedData.length} symbols\n`);
    
    combinedData.forEach(company => {
      console.log(`📈 ${company.symbol}:`);
      console.log(`   Company: ${company.companyName}`);
      console.log(`   Sector: ${company.sector}`);
      console.log(`   Industry: ${company.industry}`);
      console.log(`   Price: $${company.price}`);
      console.log(`   Change: $${company.change} (${company.changePercent.toFixed(2)}%)`);
      console.log(`   Volume: ${company.volume.toLocaleString()}`);
      console.log(`   Market Cap: $${(company.marketCap / 1000000000).toFixed(2)}B`);
      console.log('');
    });
    
    console.log(`📊 API calls used: ${fmpService.getRemainingCalls()} remaining out of 250`);
    
  } catch (error) {
    console.error('❌ Error testing combined data:', error);
  }
}

// Run the test
testCombinedData()
  .then(() => {
    console.log('✅ Combined data test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Combined data test failed:', error);
    process.exit(1);
  });
