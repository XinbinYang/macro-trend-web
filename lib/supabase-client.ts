import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xmdvozykqwolmfaycgyz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseClient(): SupabaseClient {
  // Prefer service role on server to avoid anon-key drift / RLS issues
  const key = supabaseServiceKey || supabaseAnonKey;
  return createClient(supabaseUrl, key);
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Helper to check if data is stale (older than 2 months)
export function isDataStale(updatedAt: string | null, dateField: string | null): boolean {
  if (!dateField) return true;
  
  const dataDate = new Date(dateField);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - dataDate.getFullYear()) * 12 + (now.getMonth() - dataDate.getMonth());
  
  return monthsDiff >= 2;
}

// Helper to convert 0 to null (avoid fake zeros)
export function sanitizeValue<T>(value: T): T | null {
  if (value === 0 || value === '0' || value === 0) return null;
  return value;
}

// Asset data types
export interface SupabaseAssetEquity {
  date: string;
  ticker: string;
  name: string | null;
  market: string | null;
  asset_class: string | null;
  open: string | null;
  high: string | null;
  low: string | null;
  close: number | null;
  volume: string | null;
  market_cap: string | null;
  source: string | null;
  updated_at: string | null;
}

export interface SupabaseAssetBond {
  date: string;
  ticker: string;
  market: string | null;
  bond_type: string | null;
  maturity: string | null;
  ytm: number | null;
  coupon: string | null;
  duration: string | null;
  modified_duration: string | null;
  convexity: string | null;
  clean_price: string | null;
  dirty_price: string | null;
  source: string | null;
  updated_at: string | null;
}

export interface SupabaseAssetCommodity {
  date: string;
  ticker: string;
  name: string | null;
  category: string | null;
  open: string | null;
  high: string | null;
  low: string | null;
  close: number | null;
  volume: string | null;
  open_interest: string | null;
  source: string | null;
  updated_at: string | null;
}

export interface SupabaseAssetFX {
  date: string;
  pair: string;
  open: string | null;
  high: string | null;
  low: string | null;
  close: number | null;
  volume: string | null;
  source: string | null;
  updated_at: string | null;
}

export interface SupabaseMacroCN {
  date: string;
  gdp_yoy: string | null;
  cpi_yoy: string | null;
  ppi_yoy: string | null;
  pmi: string | null;
  m2_yoy: number | null;
  fixed_asset_investment: string | null;
  retail_sales: string | null;
  industrial_production: string | null;
  unemployment: string | null;
  lpr_1y: string | null;
  lpr_5y: string | null;
  fx_reserve: string | null;
  trade_balance: string | null;
  source: string | null;
  updated_at: string | null;
}

export interface SupabaseMacroUS {
  date: string;
  gdp_qoq: number | null;
  gdp_yoy: string | null;
  cpi_yoy: string | null;
  core_cpi_yoy: string | null;
  ppi_yoy: string | null;
  ism_manufacturing: string | null;
  ism_services: string | null;
  unemployment_rate: string | null;
  nonfarm_payrolls: string | null;
  fed_funds_rate: string | null;
  yield_10y: string | null;
  yield_2y: string | null;
  dxy: string | null;
  consumer_confidence: string | null;
  source: string | null;
  updated_at: string | null;
}
