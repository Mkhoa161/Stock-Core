import { Company } from "@/types/company";
import CompanyTable from "../components/CompanyTable";

const sampleCompanies: Company[] = [
  {
    name: "Apple Inc.",
    ticker: "AAPL",
    marketCap: 2900000000000,
    price: 195.12,
    dayChange: 1.23,
  },
  {
    name: "Microsoft Corporation",
    ticker: "MSFT",
    marketCap: 2700000000000,
    price: 410.56,
    dayChange: -0.85,
  },
  {
    name: "Amazon.com, Inc.",
    ticker: "AMZN",
    marketCap: 1800000000000,
    price: 175.34,
    dayChange: 2.10,
  },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <CompanyTable companies={sampleCompanies} />
    </div>
  );
}