// Unified Market Data API
// Primary: Supabase (assets_equity, assets_bond, assets_commodity, assets_fx)
// Fallback: Yahoo, Eastmoney, FRED with "indicative" flag
//
// IMPORTANT: Symbol canonicalization now references lib/config/data-dictionary.ts
// - SP500 (API symbol): Supabase truth key uses SPX (assets_equity.ticker="SPX"). Do NOT query "^GSPC".
// - DXY: Yahoo symbol DX=F; Supabase FX uses pair "USDX.FX".
// - US10Y: Yield in %, not price - sourced from FRED (not Yahoo futures)

import { NextResponse } from "next/server";
import { fetchAShareWithFallback } from "@/lib/api/eastmoney-api";
import { fetchFredWithFallback, FRED_SERIES, buildFredMacroSummary } from "@/lib/api/fred-api";
import { fetchMarketQuoteWithFallback } from "@/lib/api/fallback-utils";
import { SYMBOLS } from "@/lib/config/data-dictionary";

function isStaleDaily(asOf: string | null) {
  if (!asOf) return true;
  const t = new Date(asOf).getTime();
  if (!Number.isFinite(t)) return true;
  const days = (Date.now() - t) / 86400000;
  return days > 7;
}

// Asset config - maps frontend symbols to Supabase tickers
// NOTE: ticker field matches Supabase DB column (assets_equity.ticker / assets_fx.pair)
interface AssetConfigItem {
  symbol: string;
  ticker: string;
  name: string;
  region: "US" | "CN" | "HK" | "GLOBAL";
  category: "EQUITY" | "COMMODITY" | "BOND" | "FX";
  pair?: string; // For FX table: maps to assets_fx.pair column
}

const ASSET_CONFIG: AssetConfigItem[] = [
  // US Equities (Supabase truth keys)
  // NOTE: assets_equity.ticker uses canonical keys like SPX/NDX/DJI/HS300 (not Yahoo caret symbols).
  { symbol: "SP500", ticker: "SPX", name: "S&P 500", region: "US", category: "EQUITY" },
  { symbol: "NDX", ticker: "NDX", name: "纳斯达克100", region: "US", category: "EQUITY" },
  { symbol: "DJI", ticker: "DJI", name: "道指30", region: "US", category: "EQUITY" },
  // VIX/RUT currently not in Supabase truth table; will fallback indicative
  { symbol: "VIX", ticker: SYMBOLS.US_VIX, name: "VIX恐慌指数", region: "US", category: "EQUITY" },
  { symbol: "RUT", ticker: SYMBOLS.US_RUT, name: "罗素2000", region: "US", category: "EQUITY" },

  // CN Equities (Supabase truth keys where available)
  { symbol: "HS300", ticker: "HS300", name: "沪深300", region: "CN", category: "EQUITY" },
  { symbol: "ZZ500", ticker: "ZZ500", name: "中证500", region: "CN", category: "EQUITY" },
  { symbol: "000016.SH", ticker: "000016.SH", name: "上证50", region: "CN", category: "EQUITY" },
  { symbol: SYMBOLS.CN_CY500, ticker: SYMBOLS.CN_CY500, name: "创业板指", region: "CN", category: "EQUITY" },
  { symbol: SYMBOLS.CN_KC50, ticker: SYMBOLS.CN_KC50, name: "科创50", region: "CN", category: "EQUITY" },

  // HK Equities (Supabase truth keys where available)
  { symbol: "HSI", ticker: SYMBOLS.HK_HSI, name: "恒生指数", region: "HK", category: "EQUITY" },
  { symbol: SYMBOLS.HK_HSTECH, ticker: "HSTECH", name: "恒生科技指数", region: "HK", category: "EQUITY" },

  // Commodities
  { symbol: SYMBOLS.COM_GOLD, ticker: SYMBOLS.COM_GOLD, name: "黄金期货", region: "GLOBAL", category: "COMMODITY" },
  { symbol: SYMBOLS.COM_OIL, ticker: SYMBOLS.COM_OIL, name: "WTI原油", region: "GLOBAL", category: "COMMODITY" },
  { symbol: SYMBOLS.COM_DJP, ticker: SYMBOLS.COM_DJP, name: "商品指数", region: "GLOBAL", category: "COMMODITY" },
  { symbol: "GLD", ticker: "GLD", name: "黄金ETF", region: "GLOBAL", category: "COMMODITY" },

  // Bonds (yields from FRED)
  // NOTE: US2Y/US5Y/US10Y/US30Y are yields from FRED, NOT futures prices
  { symbol: SYMBOLS.US_10Y, ticker: SYMBOLS.US_10Y, name: "美债10Y收益率", region: "US", category: "BOND" },
  { symbol: SYMBOLS.US_2Y, ticker: SYMBOLS.US_2Y, name: "美债2Y收益率", region: "US", category: "BOND" },
  { symbol: SYMBOLS.US_5Y, ticker: SYMBOLS.US_5Y, name: "美债5Y收益率", region: "US", category: "BOND" },
  { symbol: SYMBOLS.US_30Y, ticker: SYMBOLS.US_30Y, name: "美债30Y收益率", region: "US", category: "BOND" },

  // FX
  // Supabase assets_fx.pair uses "*.FX"; vendor symbols use Yahoo "...=X" where applicable.
  { symbol: "DXY", ticker: SYMBOLS.FX_DXY, name: "美元指数DXY", region: "GLOBAL", category: "FX", pair: "USDX.FX" },
  { symbol: "EURUSD", ticker: "EURUSD=X", name: "欧元/美元", region: "GLOBAL", category: "FX", pair: "EURUSD.FX" },
  { symbol: "USDJPY", ticker: "JPY=X", name: "美元/日元", region: "GLOBAL", category: "FX", pair: "USDJPY.FX" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "snapshot";
  const noCache = searchParams.get("no_cache") === "1";

  try {
    switch (type) {
      case "snapshot":
        return await getMarketSnapshot(noCache);
      case "a-share":
        return await getAShareData(noCache);
      case "macro":
        return await getMacroData(noCache);
      case "all":
        return await getAllData(noCache);
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Market Data API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", fallback: true },
      { status: 500 }
    );
  }
}

async function getMarketSnapshot(noCache: boolean = false) {
  const quotes = await fetchAllQuotesWithFallback();
  
  // Categorize by region
  const usAssets = quotes.filter(q => q.region === "US");
  const cnAssets = quotes.filter(q => q.region === "CN");
  const hkAssets = quotes.filter(q => q.region === "HK");
  const globalAssets = quotes.filter(q => q.region === "GLOBAL");
  
  // Count sources
  const supabaseCount = quotes.filter(q => !q.isIndicative).length;
  const fallbackCount = quotes.filter(q => q.isIndicative && q.price !== null).length;
  
  const cacheControl = noCache 
    ? "no-store" 
    : "public, s-maxage=60, stale-while-revalidate=300";
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    sources: {
      supabase: supabaseCount,
      fallback: fallbackCount,
    },
    data: {
      us: usAssets,
      china: cnAssets,
      hongkong: hkAssets,
      global: globalAssets,
    },
    disclaimer: {
      indicative: "Fallback data (FRED/Yahoo/Eastmoney) is indicative only, not for backtesting",
      truth: "Strategy backtest must use Master + official settlement data",
    },
  }, { headers: { "Cache-Control": cacheControl } });
}

async function getAShareData(noCache: boolean = false) {
  // First try Supabase via fallback
  const quotes = await fetchAllQuotesWithFallback();
  const cnAssets = quotes.filter(q => q.region === "CN");
  
  const hasSupabaseData = cnAssets.some(q => !q.isIndicative);
  
  const cacheControl = noCache 
    ? "no-store" 
    : "public, s-maxage=60, stale-while-revalidate=300";
  
  if (hasSupabaseData) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      source: "supabase",
      data: cnAssets,
    }, { headers: { "Cache-Control": cacheControl } });
  }
  
  // Fallback to Eastmoney
  const data = await fetchAShareWithFallback();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    source: data.length > 0 && data[0].price !== 3.856 ? "eastmoney" : "mock",
    data,
  }, { headers: { "Cache-Control": cacheControl } });
}

async function getMacroData(noCache: boolean = false) {
  // Fetch key macro indicators via fallback chain
  const [
    fedFunds,
    treasury10y,
    cpi,
    unemployment,
    fredSummary,
  ] = await Promise.all([
    fetchFredWithFallback(FRED_SERIES.FED_FUNDS, 1),
    fetchFredWithFallback(FRED_SERIES.TREASURY_10Y, 1),
    fetchFredWithFallback(FRED_SERIES.CPI, 12),
    fetchFredWithFallback(FRED_SERIES.UNEMPLOYMENT, 1),
    buildFredMacroSummary(),
  ]);

  const isRealData = fedFunds.length > 0 && fedFunds[0].value !== 4.5;

  const cacheControl = noCache 
    ? "no-store" 
    : "public, s-maxage=60, stale-while-revalidate=300";

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    source: isRealData ? "fred" : "mock",
    indicators: {
      fedFunds: fedFunds[0],
      treasury10y: treasury10y[0],
      cpi: cpi[cpi.length - 1],
      unemployment: unemployment[0],
    },
    summary: fredSummary,
  }, { headers: { "Cache-Control": cacheControl } });
}

async function getAllData(noCache: boolean = false) {
  const [snapshot, macro] = await Promise.all([
    getMarketSnapshot(noCache),
    getMacroData(noCache),
  ]);

  const snapshotData = await snapshot.json();
  const macroData = await macro.json();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    market: snapshotData,
    macro: macroData,
  });
}

// Fetch all quotes using unified fallback chain
async function fetchAllQuotesWithFallback() {
  const results = await Promise.all(
    ASSET_CONFIG.map(async (config) => {
      try {
        // For FX: use pair field (e.g., "USDX.FX") for Supabase query, not the Yahoo symbol
        // For other assets: use ticker field
        const supabaseKey = config.pair || config.ticker;

        // BOND (yields): do NOT query assets_equity; prefer Supabase macro_us daily yields (written by /api/cron/daily-yields).
        if (config.category === "BOND") {
          // Query Supabase macro_us first
          try {
            const supabaseUrl =
              process.env.SUPABASE_URL ||
              process.env.NEXT_PUBLIC_SUPABASE_URL ||
              "https://xmdvozykqwolmfaycgyz.supabase.co";
            const supabaseKey =
              process.env.SUPABASE_SERVICE_ROLE_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
              "";
            if (supabaseKey) {
              const { createClient } = await import("@supabase/supabase-js");
              const sb2 = createClient(supabaseUrl, supabaseKey);
              const fieldMap: Record<string, string> = {
                US2Y: "yield_2y",
                US10Y: "yield_10y",
              };
              const field = fieldMap[config.ticker];
              if (field) {
                // Use concrete selects to keep typing + avoid template-string select errors
                const { data, error } =
                  field === "yield_2y"
                    ? await sb2
                        .from("macro_us")
                        .select("date,yield_2y,source,updated_at")
                        .order("date", { ascending: false })
                        .limit(1)
                    : await sb2
                        .from("macro_us")
                        .select("date,yield_10y,source,updated_at")
                        .order("date", { ascending: false })
                        .limit(1);

                if (!error && data && data[0]) {
                  const row = data[0] as {
                    date: string;
                    yield_2y?: number | string | null;
                    yield_10y?: number | string | null;
                    source?: string | null;
                    updated_at?: string | null;
                  };
                  const raw = field === "yield_2y" ? row.yield_2y : row.yield_10y;
                  const val = typeof raw === "number" ? raw : raw ? Number(raw) : null;
                  if (Number.isFinite(val)) {
                    const asOf = String(row.date).slice(0, 10);
                    return {
                      symbol: config.ticker,
                      name: config.name,
                      price: val,
                      change: null,
                      changePercent: null,
                      timestamp: String(row.updated_at || row.date),
                      source: String(row.source || "Supabase"),
                      isIndicative: false,
                      isStale: isStaleDaily(asOf),
                      region: config.region,
                      category: config.category,
                    };
                  }
                }
              }
            }
          } catch {
            // ignore
          }

          // Fallback to FRED (may be unavailable if api key not configured)
          const map: Record<string, string> = {
            US2Y: FRED_SERIES.TREASURY_2Y,
            US5Y: FRED_SERIES.TREASURY_5Y,
            US10Y: FRED_SERIES.TREASURY_10Y,
            US30Y: FRED_SERIES.TREASURY_30Y,
          };
          const series = map[config.ticker];
          if (series) {
            const d = await fetchFredWithFallback(series, 2);
            if (d && d.length) {
              const latest = d[d.length - 1];
              return {
                symbol: config.ticker,
                name: config.name,
                price: latest.value,
                change: null,
                changePercent: null,
                timestamp: latest.date,
                source: "FRED",
                isIndicative: true,
                isStale: isStaleDaily(latest.date),
                region: config.region,
                category: config.category,
              };
            }
          }
        }

        const fallbackResult = await fetchMarketQuoteWithFallback(
          supabaseKey,
          config.region,
          config.category
        );

        // FX fallback: if Supabase returned OFF (no row for pair like "EURUSD.FX"),
        // retry with the Yahoo vendor symbol (e.g., "EURUSD=X", "JPY=X")
        if (
          config.category === "FX" &&
          config.pair &&
          config.ticker !== config.pair &&
          (fallbackResult.source === "OFF" || fallbackResult.price === null)
        ) {
          const yahooResult = await fetchMarketQuoteWithFallback(
            config.ticker,
            config.region,
            "FX"
          );
          if (yahooResult.price !== null && yahooResult.source !== "OFF") {
            return {
              ...yahooResult,
              symbol: config.symbol,
              name: config.name,
              region: config.region,
              category: config.category,
            };
          }
        }

        return {
          ...fallbackResult,
          symbol: config.symbol,
          name: config.name,
          region: config.region,
          category: config.category,
        };
      } catch (e) {
        console.error(`[Market Fallback] Error fetching ${config.symbol}:`, e);
        return null;
      }
    })
  );

  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}
