"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatMarketCap, formatVolume, formatDate } from "@/lib/utils";
import { useCompanies } from "@/lib/hooks";
import { useDebounce } from "@/lib/useDebounce";

export function CompaniesTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const searchQuery = searchParams.get("search") || "";

  // Controlled input — local state for keystrokes; URL is source of truth
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Sync local input when URL changes (browser back/forward)
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Single updateUrl call prevents double-fetch from two effects
  const updateUrl = (newPage: number, newSearch: string) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    if (newSearch) params.set("search", newSearch);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // When debounced search changes, reset to page 1 in single call
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      updateUrl(1, debouncedSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  // Note: updateUrl omitted from deps intentionally — it's a stable closure

  const { data, isLoading, error } = useCompanies(page, debouncedSearch);
  const companies = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Companies</h2>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by ticker, name, sector, or industry..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="block w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  updateUrl(1, "");
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label="Clear search"
              >
                <span className="text-gray-400 hover:text-gray-600">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Results Info */}
        {searchInput && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Showing {total} result{total !== 1 ? "s" : ""}
          </div>
        )}
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
            {companies.length > 0 ? (
              companies.map((company) => (
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
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center">
                    <svg className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-lg font-medium">No companies found</p>
                    <p className="text-sm">Try adjusting your search terms</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateUrl(page - 1, searchQuery)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Prev
          </button>
          <button
            onClick={() => updateUrl(page + 1, searchQuery)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
