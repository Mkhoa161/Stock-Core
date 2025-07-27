"use client";
import { use, useEffect, useRef} from "react";
import { Company } from "@/types/company";
import * as echarts from 'echarts';

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

interface CompanyDetailProps {
  params: Promise<{ ticker: string }>;
}

export default function CompanyDetailPage({ params }: CompanyDetailProps) {
  const { ticker } = use(params);

  const company = sampleCompanies.find(
    (c) => c.ticker.toLowerCase() === ticker.toLowerCase()
  );

  // Ref for the chart DOM node
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Candlestick sample data
    const candleData = [
      [20, 34, 10, 38],
      [40, 35, 30, 50],
      [31, 38, 33, 44],
      [38, 15, 5, 42],
    ];

    const xData = ["2024-10-24", "2024-10-25", "2024-10-26", "2024-10-27"];

    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);
      const option = {
        xAxis: {
          data: xData,
        },
        yAxis: {},
        series: [
          {
            type: "candlestick",
            data: candleData,
          },
        ],
      };
      myChart.setOption(option);

      // Cleanup on unmount
      return () => {
        myChart.dispose();
      };
    }
  }, []);

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
      <h1 className="text-2xl font-bold mb-2">
        {company.name} ({company.ticker})
      </h1>
      <p className="mb-1">Market Cap: {company.marketCap.toLocaleString()}</p>
      <p className="mb-1">Price: ${company.price.toFixed(2)}</p>
      <p className="mb-4">Day Change: {company.dayChange.toFixed(2)}</p>
      {/* Add chart and more details here */}
      <div className="mt-6">
        <div ref={chartRef} style={{ width: "100%", height: 400 }} />
      </div>
    </div>
  );
}