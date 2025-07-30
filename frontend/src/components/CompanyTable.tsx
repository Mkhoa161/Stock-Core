"use client";
import { useRouter } from "next/navigation";
import { Company } from "../types/company";

interface CompanyTableProps {
  companies: Company[];
}

export default function CompanyTable({ companies }: CompanyTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded shadow bg-[#B2BEC1]">
        <thead className="bg-[#0A3039]">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Ticker</th>
            <th className="px-4 py-2 text-right">Market Cap</th>
            <th className="px-4 py-2 text-right">Price</th>
            <th className="px-4 py-2 text-right">Day Change</th>
          </tr>
        </thead>
        <tbody className="text-black">
          {companies.map((company) => (
            <tr key={company.ticker} className="border-t hover:bg-gray-700 transition" onClick={() => router.push(`/company/${company.ticker}`)}>
              <td className="px-4 py-2">
                <span className="hover:underline cursor-pointer">
                  {company.name}
                </span>
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