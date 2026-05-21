import { useQuery, keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";
import { Company, PaginatedCompaniesResponse } from "@/types/company";

// Hook for fetching paginated companies with optional search
export function useCompanies(page: number = 1, search: string = "") {
  return useQuery<PaginatedCompaniesResponse>({
    queryKey: ["companies", page, search],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: "50",
      };
      if (search) params.search = search;
      return api.get("/api/companies/", params);
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

// Hook for fetching individual company data
export function useCompany(ticker: string) {
  return useQuery({
    queryKey: ["company", ticker],
    queryFn: async (): Promise<Company> => {
      const data = await api.get(`/api/companies/${ticker}`);
      return data;
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

// Types for historical data
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

interface UseHistoricalDataParams {
  ticker: string;
  from?: string;
  to?: string;
  days?: number;
}

// Hook for fetching historical data
export function useHistoricalData({ ticker, from, to, days = 30 }: UseHistoricalDataParams) {
  return useQuery({
    queryKey: ["historical", ticker, from, to, days],
    queryFn: async (): Promise<HistoricalResponse> => {
      const url = `/api/companies/${ticker}/historical`;
      const params: Record<string, string> = {};
      
      if (from && to) {
        params.from = from;
        params.to = to;
      } else {
        params.days = days.toString();
      }

      const response = await api.get(url, params);
      return response;
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

