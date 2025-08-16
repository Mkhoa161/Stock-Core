import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { companyService } from '../services/companyService';

dotenv.config();

interface SP500Company {
  ticker: string;
  name: string;
}

async function scrapeSP500Companies(): Promise<SP500Company[]> {
  try {
    console.log('🔍 Scraping S&P 500 companies from Wikipedia...');
    
    // Wikipedia S&P 500 page
    const url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const companies: SP500Company[] = [];
    
    // Find the main table with S&P 500 companies
    const table = $('table.wikitable').first();
    
    table.find('tbody tr').each((index, element) => {
      const columns = $(element).find('td');
      
      if (columns.length >= 2) {
        const ticker = $(columns[0]).text().trim();
        const name = $(columns[1]).text().trim();
        
        // Only add if we have a valid ticker and name
        if (ticker && name && ticker.length <= 10) {
          // Convert dots to hyphens for FMP compatibility (e.g., BF.B -> BF-B)
          const originalTicker = ticker.toUpperCase();
          const fmpTicker = originalTicker.replace(/\./g, '-');
          
          // Log ticker conversions for transparency
          if (originalTicker !== fmpTicker) {
            console.log(`🔄 Converting ticker: ${originalTicker} → ${fmpTicker}`);
          }
          
          companies.push({
            ticker: fmpTicker,
            name
          });
        }
      }
    });
    
    console.log(`✅ Scraped ${companies.length} S&P 500 companies`);
    return companies;
    
  } catch (error) {
    console.error('❌ Error scraping S&P 500 companies:', error);
    throw error;
  }
}

async function loadSP500ToDatabase(): Promise<void> {
  try {
    console.log('🚀 Loading S&P 500 companies to database...');
    
    // Scrape companies from Wikipedia
    const companies = await scrapeSP500Companies();
    
    let created = 0;
    let skipped = 0;
    
    // Load companies into database
    for (const company of companies) {
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
          created++;
          console.log(`✅ Created: ${company.ticker} - ${company.name}`);
        } else {
          skipped++;
          console.log(`⏭️ Skipped (exists): ${company.ticker} - ${company.name}`);
        }
      } catch (error: any) {
        console.error(`❌ Error creating ${company.ticker}:`, error.message);
      }
    }
    
    console.log(`🎉 Database loading completed!`);
    console.log(`📊 Created: ${created} companies`);
    console.log(`⏭️ Skipped: ${skipped} companies (already exist)`);
    console.log(`📈 Total companies in database: ${created + skipped}`);
    
  } catch (error) {
    console.error('❌ Error loading S&P 500 to database:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  loadSP500ToDatabase()
    .then(() => {
      console.log('✅ S&P 500 loading script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ S&P 500 loading script failed:', error);
      process.exit(1);
    });
}

export { scrapeSP500Companies, loadSP500ToDatabase };
