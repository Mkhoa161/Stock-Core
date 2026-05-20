import { readFileSync } from 'fs';
import path from 'path';
import { CompanyDetail } from "@/components/CompanyDetail";

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export function generateStaticParams() {
  const filePath = path.join(process.cwd(), 'src/data/tickers.json');
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as { tickers: string[] };
  return data.tickers.map((ticker) => ({ ticker }));
}

export default function CompanyPage({ params }: PageProps) {
  return <CompanyDetail params={params} />;
}
