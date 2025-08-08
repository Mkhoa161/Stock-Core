import { companyService } from '../services/companyService';

const sampleCompanies = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics'
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    industry: 'Software'
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com, Inc.',
    sector: 'Consumer Cyclical',
    industry: 'Internet Retail'
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Technology',
    industry: 'Internet Content & Information'
  },
  {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers'
  }
];

// Generate mock stock data for testing
const generateMockStockData = (companyId: number, basePrice: number) => {
  const data = [];
  const today = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate realistic price movements
    const volatility = 0.02; // 2% daily volatility
    const change = (Math.random() - 0.5) * volatility;
    const price = basePrice * (1 + change);
    
    const open = price * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, price) * (1 + Math.random() * 0.005);
    const low = Math.min(open, price) * (1 - Math.random() * 0.005);
    const close = price;
    const volume = Math.floor(Math.random() * 10000000) + 1000000;
    const marketCap = basePrice * 1000000000; // Simplified market cap
    
    data.push({
      company_id: companyId,
      date,
      open_price: parseFloat(open.toFixed(2)),
      high_price: parseFloat(high.toFixed(2)),
      low_price: parseFloat(low.toFixed(2)),
      close_price: parseFloat(close.toFixed(2)),
      volume,
      market_cap: marketCap
    });
    
    basePrice = close; // Use close price as base for next day
  }
  
  return data;
};

const seedData = async () => {
  try {
    console.log('🌱 Starting data seeding...');
    
    // Create companies
    for (const companyData of sampleCompanies) {
      try {
        const company = await companyService.createCompany(companyData);
        console.log(`✅ Created company: ${company.ticker} - ${company.name}`);
        
        // Generate and store mock stock data
        console.log(`📊 Generating mock data for ${company.ticker}...`);
        const basePrice = Math.random() * 500 + 50; // Random price between $50-$550
        const stockData = generateMockStockData(company.id, basePrice);
        
        // Insert stock prices
        for (const priceData of stockData) {
          await companyService.createStockPrice(priceData);
        }
        
        // Create daily summaries
        const latestPrice = stockData[stockData.length - 1];
        const previousPrice = stockData[stockData.length - 2];
        
        if (latestPrice && previousPrice) {
          const dayChange = latestPrice.close_price - previousPrice.close_price;
          const dayChangePercent = (dayChange / previousPrice.close_price) * 100;
          
          await companyService.createDailySummary({
            company_id: company.id,
            date: latestPrice.date,
            price: latestPrice.close_price,
            day_change: parseFloat(dayChange.toFixed(2)),
            day_change_percent: parseFloat(dayChangePercent.toFixed(2)),
            market_cap: latestPrice.market_cap,
            volume: latestPrice.volume
          });
        }
        
        console.log(`✅ Successfully added mock data for ${company.ticker}`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️ Company ${companyData.ticker} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating ${companyData.ticker}:`, error.message);
        }
      }
    }
    
    console.log('🎉 Data seeding completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  seedData();
}

export default seedData;
