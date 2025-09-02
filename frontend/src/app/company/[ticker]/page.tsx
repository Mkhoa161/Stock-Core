import { CompanyDetail } from "@/components/CompanyDetail";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

// Required for static export with dynamic routes
export async function generateStaticParams() {
  // For now, return an empty array - this will be populated when you have actual company data
  // In production, you could fetch this from your API or database
  return [];
}

export default function CompanyPage({ params }: PageProps) {
  return <CompanyDetail params={params} />;
}