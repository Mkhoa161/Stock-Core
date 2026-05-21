import { Router, Request, Response } from 'express';
import { companyService } from '../services/companyService';
import { historicalDataService } from '../services/historicalDataService';

const router = Router();

// Get all companies with pagination and search
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const search = ((req.query.search as string) || '').trim();

    const { data, total } = await companyService.getAllCompaniesWithLatestDataPaginated(page, limit, search);
    const totalPages = Math.ceil(total / limit);

    res.json({ data, total, page, limit, totalPages });
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



// Get historical data with lazy loading (supports custom date ranges)
router.get('/:ticker/historical', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ message: 'Ticker is required' });
    }
    
    // Support both old format (days) and new format (date range)
    const days = req.query.days ? parseInt(req.query.days as string) : null;
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    
    // Validate date range if provided
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
      }
      
      if (from > to) {
        return res.status(400).json({ message: 'Start date must be before end date' });
      }
      
      // Check if date range is too large (max 2 years)
      const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 730) {
        return res.status(400).json({ message: 'Date range cannot exceed 2 years' });
      }
    }
    
    // Use lazy loading service with date range
    const result = await historicalDataService.getHistoricalData({ 
      ticker, 
      days: days || undefined,
      fromDate,
      toDate
    });
    
    if (!result.success) {
      return res.status(404).json({ 
        message: 'Failed to fetch historical data', 
        error: result.error 
      });
    }
    
    // Calculate days for response
    let responseDays = 60; // default
    if (days) {
      responseDays = days;
    } else if (fromDate && toDate) {
      responseDays = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Return with metadata about the source
    res.json({
      ticker,
      dateRange: fromDate && toDate ? { from: fromDate, to: toDate } : null,
      days: responseDays,
      dataPoints: result.data?.length || 0,
      data: result.data,
      source: result.source,
      cached: result.cached,
      message: result.cached 
        ? 'Data retrieved from cache' 
        : 'Data fetched from API and cached'
    });
    
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch historical data', error: error.message });
  }
});

export default router;
