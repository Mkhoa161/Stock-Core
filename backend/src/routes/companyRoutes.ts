import { Router, Request, Response } from 'express';
import { companyService } from '../services/companyService';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();

// Get all companies with latest data (dashboard)
router.get('/', async (req: Request, res: Response) => {
  try {
    const companies = await companyService.getAllCompaniesWithLatestData();
    res.json(companies);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
  }
});

// Get specific company with latest data
router.get('/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ message: 'Ticker is required' });
    }
    
    const company = await companyService.getCompanyWithLatestData(ticker);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch company', error: error.message });
  }
});

// Get stock prices for a company (for candlestick chart)
router.get('/:ticker/prices', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ message: 'Ticker is required' });
    }
    
    const days = parseInt(req.query.days as string) || 30;
    
    const prices = await companyService.getStockPrices(ticker, days);
    
    if (!prices || prices.length === 0) {
      return res.status(404).json({ message: 'No price data found for this company' });
    }
    
    res.json(prices);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch stock prices', error: error.message });
  }
});

// Create a new company (admin only - for data seeding)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticker, name, sector, industry } = req.body;
    
    if (!ticker || !name) {
      return res.status(400).json({ message: 'Ticker and name are required' });
    }
    
    const company = await companyService.createCompany({ ticker, name, sector, industry });
    res.status(201).json(company);
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Company with this ticker already exists' });
    }
    res.status(500).json({ message: 'Failed to create company', error: error.message });
  }
});

// Add stock price data (for data pipeline)
router.post('/:ticker/prices', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ message: 'Ticker is required' });
    }
    
    const { date, open_price, high_price, low_price, close_price, volume, market_cap } = req.body;
    
    // Get company ID
    const company = await companyService.getCompanyByTicker(ticker);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    const stockPrice = await companyService.createStockPrice({
      company_id: company.id,
      date: new Date(date),
      open_price,
      high_price,
      low_price,
      close_price,
      volume,
      market_cap
    });
    
    res.status(201).json(stockPrice);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create stock price', error: error.message });
  }
});

// Add daily summary data (for data pipeline)
router.post('/:ticker/summary', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ message: 'Ticker is required' });
    }
    
    const { date, price, day_change, day_change_percent, market_cap, volume } = req.body;
    
    // Get company ID
    const company = await companyService.getCompanyByTicker(ticker);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    const summary = await companyService.createDailySummary({
      company_id: company.id,
      date: new Date(date),
      price,
      day_change,
      day_change_percent,
      market_cap,
      volume
    });
    
    res.status(201).json(summary);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create daily summary', error: error.message });
  }
});

// Update company data from Yahoo Finance
router.post('/:ticker/update-from-yahoo', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ message: 'Ticker is required' });
    }
    
    const success = await companyService.updateCompanyDataFromYahoo(ticker);
    
    if (success) {
      res.json({ message: `Successfully updated data for ${ticker}` });
    } else {
      res.status(500).json({ message: `Failed to update data for ${ticker}` });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update company data', error: error.message });
  }
});

export default router;
