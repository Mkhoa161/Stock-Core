"use client";

import Link from "next/link";
import { formatCurrency, formatMarketCap, formatVolume, formatDate } from "@/lib/utils";
import { useCompanies } from "@/lib/hooks";

export function CompaniesTable() {
  const { data: companies, isLoading, error } = useCompanies();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <div className="text-center">Loading companies...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <div className="text-center text-red-600">Error: {error.message}</div>
      </div>
    );
  }

  if (!companies) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <div className="text-center text-gray-600">No companies found</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Companies</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                Ticker
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-48">
                Company Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                Industry
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                Price
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                Market Cap
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                Day Change
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                Volume
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-3 py-4 whitespace-nowrap">
                  <Link
                    href={`/company/${company.ticker}`}
                    className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    {company.ticker}
                  </Link>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-40" title={company.name}>
                      {company.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-40" title={company.sector}>
                      {company.sector}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 max-w-24 truncate" title={company.industry}>
                    {company.industry}
                  </span>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-right font-mono text-gray-900 dark:text-white text-sm">
                  {company.latest_price !== null && company.latest_price !== undefined ? formatCurrency(Number(company.latest_price)) : <span className="text-gray-400">N/A</span>}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-right font-mono text-gray-900 dark:text-white text-sm">
                  {company.latest_market_cap !== null && company.latest_market_cap !== undefined ? formatMarketCap(Number(company.latest_market_cap)) : <span className="text-gray-400">N/A</span>}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(Number(company.latest_day_change) || 0) >= 0 ? (
                      <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                    <span className={`font-mono text-sm ${(Number(company.latest_day_change) || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {company.latest_day_change !== null && company.latest_day_change !== undefined ? (
                        <>
                          {(Number(company.latest_day_change) || 0) >= 0 ? "+" : ""}
                          {(Number(company.latest_day_change) || 0).toFixed(2)} ({(Number(company.latest_day_change_percent) || 0).toFixed(2)}%)
                        </>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-right font-mono text-gray-500 dark:text-gray-400 text-sm">
                  {company.latest_volume !== null && company.latest_volume !== undefined ? formatVolume(Number(company.latest_volume)) : <span className="text-gray-400">N/A</span>}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-right text-gray-500 dark:text-gray-400 text-xs">
                  {formatDate(company.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
