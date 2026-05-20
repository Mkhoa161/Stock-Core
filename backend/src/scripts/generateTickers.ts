import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const OUTPUT_PATH = path.resolve(__dirname, '../../../frontend/src/data/tickers.json');

async function generateTickers(): Promise<void> {
  try {
    console.log('🔍 Scraping S&P 500 tickers from Wikipedia...');

    const url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'StockCore/1.0 (personal project; khoango)' },
    });

    const $ = cheerio.load(response.data);
    const tickers: string[] = [];

    $('table.wikitable')
      .first()
      .find('tbody tr')
      .each((_index, element) => {
        const columns = $(element).find('td');

        if (columns.length >= 2) {
          const ticker = $(columns[0]).text().trim();

          if (ticker && ticker.length <= 10) {
            tickers.push(ticker.toUpperCase());
          }
        }
      });

    if (tickers.length < 400) {
      throw new Error(
        `Sanity check failed: only scraped ${tickers.length} tickers (expected 490+). Wikipedia table format may have changed.`,
      );
    }

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ tickers }, null, 2), 'utf-8');

    console.log(`✅ Wrote ${tickers.length} tickers to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Error generating tickers:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  generateTickers()
    .then(() => {
      console.log('✅ generateTickers completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ generateTickers failed:', error);
      process.exit(1);
    });
}

export { generateTickers };
