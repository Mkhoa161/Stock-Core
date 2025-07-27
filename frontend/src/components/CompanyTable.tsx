import { Company } from "../types/company";
import Link from "next/link";

interface CompanyTableProps {
  companies: Company[];
}

export default function CompanyTable({ companies }: CompanyTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded shadow bg-white dark:bg-black">
        <thead className="bg-gray-100 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Ticker</th>
            <th className="px-4 py-2 text-right">Market Cap</th>
            <th className="px-4 py-2 text-right">Price</th>
            <th className="px-4 py-2 text-right">Day Change</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.ticker} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <td className="px-4 py-2">
                <Link href={`/company/${company.ticker}`}>
                  <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                    {company.name}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-2">{company.ticker}</td>
              <td className="px-4 py-2 text-right">{company.marketCap.toLocaleString()}</td>
              <td className="px-4 py-2 text-right">${company.price.toFixed(2)}</td>
              <td className={`px-4 py-2 text-right ${company.dayChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {company.dayChange.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}