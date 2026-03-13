/**
 * Shared fallback utilities for data fetching
 * Priority: Supabase (with last-non-null fallback) -> FRED (US macro) / AkShare (CN macro) -> Yahoo/Eastmoney (market)
 */

import { createClient } from "@supabase/supabase-js";
import { fetchFredSeries, FRED_SERIES } from "./fred-api";
import { fetchAIndex, fetchHKIndex } from "./eastmoney-api";

// === Supabase Client ===
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// === Date Utilities ===
export function monthKey(isoDate: string) {
  return isoDate.slice(0, 7); // YYYY-MM
}

export function monthsDiff(a: string, b: string) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (ay - by) * 12 + (am - bm);
}

export function isMacroMonthlyStale(asOf: string | null) {
  if (!asOf) return true;
  const now = new Date();
  const cur = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const as = monthKey(asOf);
  return monthsDiff(cur, as) > 1;
}

// === Type Helpers ===
export function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  if (s === "0" || s === "0.0") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// === Last Non-Null Fallback for Macro Data ===
const MAX_LOOKBACK_MONTHS = 12;

interface MacroFetchResult {
  value: number | null;
  asOf: string | null;
  source: string;
  isStale: boolean;
  qualityTag: "Truth" | "Indicative";
}

/**
 * Fetch macro indicator with last-non-null fallback
 * 1. Try Supabase latest row
 * 2. If value is null, look back up to 12 months
 * 3. If still null, fallback to FRED (US) or AkShare (CN)
 */
export async function fetchMacroWithFallback(
  table: "macro_us" | "macro_cn",
  field: string,
  region: "US" | "CN",
  sourceOverride?: string
): Promise<MacroFetchResult> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const defaultResult: MacroFetchResult = {
    value: null,
    asOf: null,
    source: region === "US" ? "FRED" : "AkShare",
    isStale: true,
    qualityTag: "Indicative",
  };

  // === Step 1: Try Supabase latest ===
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("date, source")
        .order("date", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const latestDate = data[0].date;
        const latestSource = data[0].source;

        // Get the specific field value
        const { data: fieldData, error: fieldError } = await supabase
          .from(table)
          .select(field)
          .eq("date", latestDate)
          .limit(1);

        if (!fieldError && fieldData && fieldData.length > 0) {
          const row = fieldData[0] as unknown as Record<string, unknown>;
          const val = toNum(row[field]);
          
          if (val !== null) {
            const asOf = latestDate.slice(0, 10);
            const isStale = isMacroMonthlyStale(asOf);
            const qualityTag = (latestSource as string)?.includes("master") || (latestSource as string)?.includes("akshare") 
              ? "Truth" 
              : "Indicative";

            return {
              value: val,
              asOf,
              source: sourceOverride || "Supabase",
              isStale,
              qualityTag,
            };
          }
        }
      }
    } catch (e) {
      console.error(`[Fallback] Supabase error for ${table}.${field}:`, e);
    }
  }

  // === Step 2: Last-non-null fallback (up to 12 months) ===
  if (supabase) {
    try {
      const lookbackDate = new Date(now);
      lookbackDate.setMonth(lookbackDate.getMonth() - MAX_LOOKBACK_MONTHS);
      const lookbackStr = lookbackDate.toISOString().slice(0, 10);

      // Fetch multiple rows looking for non-null
      const { data: historyData, error: historyError } = await supabase
        .from(table)
        .select(`date, ${field}, source`)
        .lte("date", now.toISOString().slice(0, 10))
        .gte("date", lookbackStr)
        .order("date", { ascending: false });

      if (!historyError && historyData && historyData.length > 0) {
        // Find first non-null value (most recent)
        for (const row of historyData) {
          // Use type-safe access - cast the whole row
          const rowAny = row as unknown as { date: string; source: string; [key: string]: unknown };
          const val = toNum(rowAny[field]);
          if (val !== null) {
            const asOf = rowAny.date.slice(0, 10);
            const isStale = isMacroMonthlyStale(asOf);
            const qualityTag = rowAny.source?.includes("master") || rowAny.source?.includes("akshare")
              ? "Truth"
              : "Indicative";

            return {
              value: val,
              asOf,
              source: sourceOverride || "Supabase(last-non-null)",
              isStale,
              qualityTag,
            };
          }
        }
      }
    } catch (e) {
      console.error(`[Fallback] Last-non-null search error for ${table}.${field}:`, e);
    }
  }

  // === Step 3: External Fallback ===
  if (region === "US") {
    // Map field to FRED series
    const fredSeriesMap: Record<string, string> = {
      cpi_yoy: FRED_SERIES.CPI_YOY,
      core_cpi_yoy: FRED_SERIES.CORE_CPI_YOY,
      ism_manufacturing: FRED_SERIES.ISM_PMI,
      unemployment_rate: FRED_SERIES.UNEMPLOYMENT,
      fed_funds_rate: FRED_SERIES.FED_FUNDS,
      yield_10y: FRED_SERIES.TREASURY_10Y,
      yield_2y: FRED_SERIES.TREASURY_2Y,
    };

    const fredSeries = fredSeriesMap[field];
    if (fredSeries) {
      const fredData = await fetchFredSeries(fredSeries, 2);
      if (fredData && fredData.length > 0) {
        const latest = fredData[fredData.length - 1];
        return {
          value: latest.value,
          asOf: latest.date,
          source: "FRED",
          isStale: isMacroMonthlyStale(latest.date),
          qualityTag: "Indicative",
        };
      }
    }
  } else {
    // CN macro - use AkShare (via existing Eastmoney functions for indices)
    // For now, return default - CN macro fallback requires AkShare integration
    console.log(`[Fallback] CN macro fallback not implemented for ${field}`);
  }

  return defaultResult;
}

// === Market Data Fallback ===
interface MarketQuoteResult {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  timestamp: string;
  source: string;
  isIndicative: boolean;
  isStale: boolean;
}

/**
 * Fetch market quote with fallback
 * 1. Try Supabase
 * 2. If null/off, fallback to Yahoo (US/Global) or Eastmoney (CN/HK)
 */
export async function fetchMarketQuoteWithFallback(
  symbol: string,
  region: "US" | "CN" | "HK" | "GLOBAL",
  category: "EQUITY" | "COMMODITY" | "BOND" | "FX"
): Promise<MarketQuoteResult> {
  const defaultResult: MarketQuoteResult = {
    symbol,
    name: symbol,
    price: null,
    change: null,
    changePercent: null,
    timestamp: new Date().toISOString(),
    source: "OFF",
    isIndicative: true,
    isStale: true,
  };

  // === Step 1: Try Supabase ===
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      let table: string;
      let eqField: string;
      
      if (category === "FX") {
        table = "assets_fx";
        eqField = "pair";
      } else if (category === "COMMODITY") {
        table = "assets_commodity";
        eqField = "ticker";
      } else {
        table = "assets_equity";
        eqField = "ticker";
      }

      const { data, error } = await supabase
        .from(table)
        .select("date, close, source")
        .eq(eqField, symbol)
        .order("date", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const price = toNum(data[0].close);
        if (price !== null) {
          return {
            symbol,
            name: symbol,
            price,
            change: null,
            changePercent: null,
            timestamp: data[0].date as string,
            source: (data[0].source as string) || "Supabase",
            isIndicative: false,
            isStale: false,
          };
        }
      }
    } catch (e) {
      console.error(`[Fallback] Supabase market error for ${symbol}:`, e);
    }
  }

  // === Step 2: External Fallback ===
  if (region === "CN" || region === "HK") {
    // Use Eastmoney for CN/HK indices
    try {
      if (region === "HK" && symbol === "HSI") {
        const q = await fetchHKIndex("100.HSI");
        if (q) {
          return {
            symbol,
            name: q.name,
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            timestamp: new Date().toISOString(),
            source: "Eastmoney",
            isIndicative: true,
            isStale: false,
          };
        }
      } else if (region === "CN") {
        // Convert symbol to Eastmoney format
        const code = symbol.replace(".SH", "").replace(".SZ", "");
        const q = await fetchAIndex(code);
        if (q) {
          return {
            symbol,
            name: q.name,
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            timestamp: new Date().toISOString(),
            source: "Eastmoney",
            isIndicative: true,
            isStale: false,
          };
        }
      }
    } catch (e) {
      console.error(`[Fallback] Eastmoney error for ${symbol}:`, e);
    }
  }

  // US/Global - Yahoo fallback would go here
  // For now, return default indicating no data
  return defaultResult;
}
