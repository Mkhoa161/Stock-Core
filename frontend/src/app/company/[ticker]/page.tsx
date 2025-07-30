"use client";
import { use, useEffect, useRef, useState } from "react";
import { Company } from "@/types/company";
import * as echarts from "echarts";

// Sample data for demonstration; replace with real data fetching in production
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

const candleTableData = [
  {
    date: "2024-10-24",
    open: 20,
    close: 34,
    low: 10,
    high: 38,
    volume: 100000,
  },
  {
    date: "2024-10-25",
    open: 40,
    close: 35,
    low: 30,
    high: 50, 
    volume: 120000,
  },
  {
    date: "2024-10-26",
    open: 31,
    close: 38,
    low: 33,
    high: 44,
    volume: 90000,
  },
  {
    date: "2024-10-27",
    open: 38,
    close: 15,
    low: 5,
    high: 42,
    volume: 110000,
  },
];

interface CompanyDetailProps {
  params: Promise<{ ticker: string }>;
}

export default function CompanyDetailPage({ params }: CompanyDetailProps) {
  const { ticker } = use(params);

  const company = sampleCompanies.find(
    (c) => c.ticker.toLowerCase() === ticker.toLowerCase()
  );

  // Date filter state
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Filtered data
  const filteredData = candleTableData.filter((row) => {
    const date = row.date;
    const afterFrom = !from || date >= from;
    const beforeTo = !to || date <= to;
    return afterFrom && beforeTo;
  });

  // Candlestick chart data
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);
      const option = {
        xAxis: {
          data: filteredData.map((row) => row.date),
        },
        yAxis: {},
        series: [
          {
            type: "candlestick",
            data: filteredData.map((row) => [
              row.open,
              row.close,
              row.low,
              row.high,
            ]),
          },
        ],
      };
      myChart.setOption(option);

      // Cleanup on unmount
      return () => {
        myChart.dispose();
      };
    }
  }, [filteredData]);

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
      {/* Title */}
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-3xl font-bold text-center">
          {company.name}
          <span className="ml-3 text-xl font-mono text-blue-600 dark:text-blue-400">
            ({company.ticker})
          </span>
        </h1>
      </div>

      {/* Date Filter */}
      <div className="flex gap-4 mb-4 justify-center">
        <div>
          <label className="mr-2">From:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="mr-2">To:</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
      </div>

      {/* Candlestick Chart */}
      <div className="mt-6 mb-8">
        <div ref={chartRef} style={{ width: "100%", height: 400 }} />
      </div>

      {/* Stock Price Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded shadow bg-white dark:bg-black">
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
                <td className="px-4 py-2">{row.date}</td>
                <td className="px-4 py-2 text-right">{row.open}</td>
                <td className="px-4 py-2 text-right">{row.close}</td>
                <td className="px-4 py-2 text-right">{row.low}</td>
                <td className="px-4 py-2 text-right">{row.high}</td>
                <td className="px-4 py-2 text-right">{row.volume.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}