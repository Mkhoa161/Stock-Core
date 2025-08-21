"use client";

import { useState, useEffect, useRef } from "react";
import { use } from "react";
import * as echarts from "echarts";
import { formatCurrency, formatVolume, formatDate } from "@/lib/utils";
import { useCompany, useHistoricalData } from "@/lib/hooks";

interface CompanyDetailProps {
  params: Promise<{ ticker: string }>;
}

interface Company {
  id: number;
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  latest_price: number;
  latest_day_change: number;
  latest_day_change_percent: number;
  latest_volume: number;
  latest_market_cap: number;
  created_at: string;
  updated_at: string;
}

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface HistoricalResponse {
  ticker: string;
  dateRange?: {
    from: string;
    to: string;
  };
  days: number;
  dataPoints: number;
  data: HistoricalData[];
  source: string;
  cached: boolean;
  message: string;
}

export function CompanyDetail({ params }: CompanyDetailProps) {
  const { ticker } = use(params);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Use React Query hooks
  const { data: company, isLoading: companyLoading, error: companyError } = useCompany(ticker);
  const { data: historicalResponse, isLoading: historicalLoading, error: historicalError } = useHistoricalData({
    ticker,
    from: from || undefined,
    to: to || undefined,
    days: from && to ? undefined : 30
  });

  const historicalData = historicalResponse?.data || [];
  const isLoading = companyLoading || historicalLoading;
  const error = companyError || historicalError;

  // Filtered data for chart
  const filteredData = historicalData.filter((row) => {
    const date = row.date;
    const afterFrom = !from || date >= from;
    const beforeTo = !to || date <= to;
    return afterFrom && beforeTo;
  }).reverse(); // Reverse to get chronological order (oldest first) for chart

  // Candlestick chart
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current && filteredData.length > 0) {
      const myChart = echarts.init(chartRef.current);
             const option = {
         title: {
           text: `${ticker} Stock Price`,
           left: "center",
         },
         tooltip: {
           trigger: "axis",
           axisPointer: {
             type: "cross",
           },
         },
         xAxis: {
           type: "category",
           data: filteredData.map((row) => formatDate(row.date)),
         },
         yAxis: {
           type: "value",
         },
         series: [
           {
             type: "candlestick",
             data: filteredData.map((row) => [
               row.open,
               row.close,
               row.low,
               row.high,
             ]),
             itemStyle: {
               color: "#ef4444",
               color0: "#22c55e",
               borderColor: "#ef4444",
               borderColor0: "#22c55e",
             },
           },
         ],
       };
      myChart.setOption(option);

      return () => {
        myChart.dispose();
      };
    }
  }, [filteredData, ticker]);



  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h1 className="text-xl font-bold text-red-800 dark:text-red-200">Error</h1>
          <p className="text-red-600 dark:text-red-300">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading company data...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-xl font-bold">Company not found</h1>
        <p>No data available for ticker: {ticker}</p>
      </div>
    );
  }

    return (
    <div className="container mx-auto p-4">
      {/* Company Header */}
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-3xl font-bold text-center">
          {company.name}
          <span className="ml-3 text-xl font-mono text-blue-600 dark:text-blue-400">
            ({company.ticker})
          </span>
        </h1>
        <div className="mt-2 text-gray-600 dark:text-gray-400">
          {company.sector} • {company.industry}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Last updated: {formatDate(company.updated_at)}
        </div>
        <div className="mt-4 flex gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">
              {company.latest_price !== null && company.latest_price !== undefined ? formatCurrency(Number(company.latest_price)) : <span className="text-gray-400">N/A</span>}
            </div>
            <div className="text-sm text-gray-500">Current Price</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${(Number(company.latest_day_change) || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {company.latest_day_change !== null && company.latest_day_change !== undefined ? (
                <>
                  {(Number(company.latest_day_change) || 0) >= 0 ? "+" : ""}
                  {(Number(company.latest_day_change) || 0).toFixed(2)} ({(Number(company.latest_day_change_percent) || 0).toFixed(2)}%)
                </>
              ) : (
                <span className="text-gray-400">N/A</span>
              )}
            </div>
            <div className="text-sm text-gray-500">Day Change</div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex gap-4 mb-4 justify-center">
        <div>
          <label className="mr-2 text-sm font-medium">From:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mr-2 text-sm font-medium">To:</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Candlestick Chart */}
      <div className="mt-6 mb-8">
        <div ref={chartRef} style={{ width: "100%", height: 400 }} />
      </div>

      {/* Stock Price Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded shadow bg-white dark:bg-gray-800">
          <thead className="bg-gray-100 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-right">Open</th>
              <th className="px-4 py-2 text-right">Close</th>
              <th className="px-4 py-2 text-right">Low</th>
              <th className="px-4 py-2 text-right">High</th>
              <th className="px-4 py-2 text-right">Volume</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row.date} className="border-t">
                <td className="px-4 py-2">{formatDate(row.date)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.open)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.close)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.low)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.high)}</td>
                <td className="px-4 py-2 text-right">{formatVolume(row.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
