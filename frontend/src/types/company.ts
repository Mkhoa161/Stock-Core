export interface Company {
  id: number;
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  latest_price: number | string | null;
  latest_day_change: number | string | null;
  latest_day_change_percent: number | string | null;
  latest_volume: number | string | null;
  latest_market_cap: number | string | null;
  created_at: string;
  updated_at: string;
}