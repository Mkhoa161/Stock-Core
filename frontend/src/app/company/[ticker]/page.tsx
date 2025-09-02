import { CompanyDetail } from "@/components/CompanyDetail";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

// Required for static export with dynamic routes
export async function generateStaticParams() {
  try {
    // Use environment variable for API URL, fallback to localhost for development
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/companies/`);
    
    if (!response.ok) {
      console.warn('Failed to fetch companies for static generation, using fallback');
      return [];
    }
    
    const companies = await response.json();
    return companies.map((company: { ticker: string }) => ({
      ticker: company.ticker,
    }));
  } catch (error) {
    console.warn('Error fetching companies for static generation:', error);
    // Return empty array for now - this will be populated when backend is deployed
    // In production, you'll want to either:
    // 1. Deploy backend first, then build frontend
    // 2. Or hardcode some common tickers for initial build
    return [
      { ticker: 'AAPL' },
      { ticker: 'GOOG' },
      { ticker: 'MSFT' },
      { ticker: 'AMZN' },
      { ticker: 'TSLA' },
    ];
  }
}

export default function CompanyPage({ params }: PageProps) {
  return <CompanyDetail params={params} />;
}