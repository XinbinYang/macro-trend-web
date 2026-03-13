import { getSupabaseClient } from "@/lib/supabase-client";

export interface SupabaseAssetQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  timestamp: string;
  source: string;
  region: string;
  category: string;
  dataType: string;
  dataSource: string;
  status: "LIVE" | "STALE" | "OFF";
}

// Get latest quote for a single ticker from Supabase
export async function getLatestEquityQuote(ticker: string): Promise<SupabaseAssetQuote | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("assets_equity")
    .select("*")
    .eq("ticker", ticker)
    .order("date", { ascending: false })
    .limit(1);
    
  if (error || !data?.length) return null;
  
  const row = data[0];
  const price = row.close as number | null;
  const status = price === null ? "OFF" : "LIVE";
  
  return {
    symbol: row.ticker as string,
    name: (row.name as string) || ticker,
    price,
    change: null,
    changePercent: null,
    volume: row.volume ? parseInt(row.volume as string, 10) : null,
    timestamp: row.date as string,
    source: (row.source as string) || "Supabase",
    region: (row.market as string) || "UNKNOWN",
    category: "EQUITY",
    dataType: "EOD",
    dataSource: row.source ? "LIVE" : "OFF",
    status,
  };
}

// Get latest quote for commodities from Supabase
export async function getLatestCommodityQuote(ticker: string): Promise<SupabaseAssetQuote | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("assets_commodity")
    .select("*")
    .eq("ticker", ticker)
    .order("date", { ascending: false })
    .limit(1);
    
  if (error || !data?.length) return null;
  
  const row = data[0];
  const price = row.close as number | null;
  const status = price === null ? "OFF" : "LIVE";
  
  return {
    symbol: row.ticker as string,
    name: (row.name as string) || ticker,
    price,
    change: null,
    changePercent: null,
    volume: row.volume ? parseInt(row.volume as string, 10) : null,
    timestamp: row.date as string,
    source: (row.source as string) || "Supabase",
    region: "GLOBAL",
    category: "COMMODITY",
    dataType: "EOD",
    dataSource: row.source ? "LIVE" : "OFF",
    status,
  };
}

// Get latest quote for bonds from Supabase
export async function getLatestBondQuote(ticker: string): Promise<SupabaseAssetQuote | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("assets_equity")
    .select("*")
    .eq("ticker", ticker)
    .order("date", { ascending: false })
    .limit(1);
    
  if (error || !data?.length) return null;
  
  const row = data[0];
  const price = row.close as number | null;
  const status = price === null ? "OFF" : "LIVE";
  
  return {
    symbol: row.ticker as string,
    name: row.ticker as string,
    price,
    change: null,
    changePercent: null,
    volume: null,
    timestamp: row.date as string,
    source: (row.source as string) || "Supabase",
    region: "US",
    category: "BOND",
    dataType: "EOD",
    dataSource: row.source ? "LIVE" : "OFF",
    status,
  };
}

// Get latest quote for FX from Supabase
export async function getLatestFXQuote(pair: string): Promise<SupabaseAssetQuote | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("assets_fx")
    .select("*")
    .eq("pair", pair)
    .order("date", { ascending: false })
    .limit(1);
    
  if (error || !data?.length) return null;
  
  const row = data[0];
  const price = row.close as number | null;
  const status = price === null ? "OFF" : "LIVE";
  
  return {
    symbol: row.pair as string,
    name: row.pair as string,
    price,
    change: null,
    changePercent: null,
    volume: null,
    timestamp: row.date as string,
    source: (row.source as string) || "Supabase",
    region: "GLOBAL",
    category: "FX",
    dataType: "EOD",
    dataSource: row.source ? "LIVE" : "OFF",
    status,
  };
}

// Get historical data from Supabase (last N days)
export async function getHistoricalData(
  ticker: string, 
  days: number = 90
): Promise<{ date: string; close: number | null }[]> {
  const supabase = getSupabaseClient();
  
  // Check which table has this ticker
  const { data: equityCheck } = await supabase
    .from("assets_equity")
    .select("ticker")
    .eq("ticker", ticker)
    .limit(1);
    
  if (equityCheck?.length) {
    const result = await supabase
      .from("assets_equity")
      .select("date, close")
      .eq("ticker", ticker)
      .order("date", { ascending: false })
      .limit(days);
    if (result.data?.length) {
      return result.data.map((row) => ({
        date: row.date as string,
        close: row.close as number | null,
      })).reverse();
    }
  }

  // Check commodities
  const { data: commodityCheck } = await supabase
    .from("assets_commodity")
    .select("ticker")
    .eq("ticker", ticker)
    .limit(1);
    
  if (commodityCheck?.length) {
    const result = await supabase
      .from("assets_commodity")
      .select("date, close")
      .eq("ticker", ticker)
      .order("date", { ascending: false })
      .limit(days);
    if (result.data?.length) {
      return result.data.map((row) => ({
        date: row.date as string,
        close: row.close as number | null,
      })).reverse();
    }
  }

  // Check FX
  const { data: fxCheck } = await supabase
    .from("assets_fx")
    .select("pair")
    .eq("pair", ticker)
    .limit(1);
    
  if (fxCheck?.length) {
    const result = await supabase
      .from("assets_fx")
      .select("date, close")
      .eq("pair", ticker)
      .order("date", { ascending: false })
      .limit(days);
    if (result.data?.length) {
      return result.data.map((row) => ({
        date: row.date as string,
        close: row.close as number | null,
      })).reverse();
    }
  }
  
  return [];
}

// Get all latest assets by category
export async function getLatestAssetsByCategory(
  category: "equity" | "bond" | "commodity" | "fx"
): Promise<SupabaseAssetQuote[]> {
  const supabase = getSupabaseClient();
  
  let table = "assets_equity";
  let tickerField = "ticker";
  
  switch (category) {
    case "commodity":
      table = "assets_commodity";
      tickerField = "ticker";
      break;
    case "fx":
      table = "assets_fx";
      tickerField = "pair";
      break;
    case "bond":
      // Bonds are in assets_equity with specific tickers
      break;
  }
  
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("date", { ascending: false });
    
  if (error || !data?.length) return [];
  
  // Deduplicate by ticker, keeping latest
  const latestByTicker = new Map<string, Record<string, unknown>>();
  data.forEach((row) => {
    const key = row[tickerField] as string;
    if (!latestByTicker.has(key)) {
      latestByTicker.set(key, row);
    }
  });
  
  return Array.from(latestByTicker.values()).map((row) => {
    const price = row.close as number | null;
    const status = price === null ? "OFF" : "LIVE";
    
    return {
      symbol: row[tickerField] as string,
      name: (row.name as string) || (row[tickerField] as string),
      price,
      change: null,
      changePercent: null,
      volume: row.volume ? parseInt(row.volume as string, 10) : null,
      timestamp: row.date as string,
      source: (row.source as string) || "Supabase",
      region: (row.market as string) || "UNKNOWN",
      category: category.toUpperCase(),
      dataType: "EOD",
      dataSource: row.source ? "LIVE" : "OFF",
      status,
    };
  });
}
