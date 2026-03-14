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
import { SYMBOLS, SYMBOL_DISPLAY_NAMES } from "@/lib/config/data-dictionary";

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
  { symbol: "VIX", ticker: "^VIX", name: "VIX恐慌指数", region: "US", category: "EQUITY" },
  { symbol: "RUT", ticker: "^RUT", name: "罗素2000", region: "US", category: "EQUITY" },
  
  // CN Equities
  { symbol: SYMBOLS.CN_HS300, ticker: "000300.SH", name: SYMBOL_DISPLAY_NAMES["000300.SH"], region: "CN", category: "EQUITY" },
  { symbol: SYMBOLS.CN_500, ticker: "000905.SH", name: SYMBOL_DISPLAY_NAMES["000905.SH"], region: "CN", category: "EQUITY" },
  { symbol: "000016.SH", ticker: "000016.SH", name: "上证50", region: "CN", category: "EQUITY" },
  { symbol: SYMBOLS.CN_CY500, ticker: "399006.SZ", name: SYMBOL_DISPLAY_NAMES["399006.SZ"], region: "CN", category: "EQUITY" },
  { symbol: SYMBOLS.CN_KC50, ticker: "000688.SH", name: SYMBOL_DISPLAY_NAMES["000688.SH"], region: "CN", category: "EQUITY" },
  
  // HK Equities
  { symbol: SYMBOLS.HK_HSI, ticker: "HSI", name: SYMBOL_DISPLAY_NAMES["HSI"], region: "HK", category: "EQUITY" },
  
  // Commodities
  { symbol: SYMBOLS.COM_GOLD, ticker: "GC=F", name: SYMBOL_DISPLAY_NAMES["GC=F"], region: "GLOBAL", category: "COMMODITY" },
  { symbol: SYMBOLS.COM_OIL, ticker: "CL=F", name: SYMBOL_DISPLAY_NAMES["CL=F"], region: "GLOBAL", category: "COMMODITY" },
  { symbol: SYMBOLS.COM_DJP, ticker: "DJP", name: SYMBOL_DISPLAY_NAMES["DJP"], region: "GLOBAL", category: "COMMODITY" },
  { symbol: "GLD", ticker: "GLD", name: "黄金ETF", region: "GLOBAL", category: "COMMODITY" },
  
  // Bonds (from FRED - yields in %, not futures prices)
  // NOTE: US2Y/US5Y/US10Y/US30Y are yields from FRED, NOT futures prices
  { symbol: SYMBOLS.US_10Y, ticker: "US10Y", name: SYMBOL_DISPLAY_NAMES["US10Y"], region: "US", category: "BOND" },
  { symbol: SYMBOLS.US_2Y, ticker: "US2Y", name: SYMBOL_DISPLAY_NAMES["US2Y"], region: "US", category: "BOND" },
  { symbol: SYMBOLS.US_5Y, ticker: "US5Y", name: SYMBOL_DISPLAY_NAMES["US5Y"], region: "US", category: "BOND" },
  { symbol: SYMBOLS.US_30Y, ticker: "US30Y", name: SYMBOL_DISPLAY_NAMES["US30Y"], region: "US", category: "BOND" },
  
  // FX - CRITICAL: DXY uses DX=F as canonical symbol, FX table uses "pair" column
  // Supabase assets_fx.pair column stores "USDX.FX" format (not "DX=F")
  { symbol: SYMBOLS.FX_DXY, ticker: "DX=F", name: SYMBOL_DISPLAY_NAMES["DX=F"], region: "GLOBAL", category: "FX", pair: "USDX.FX" },
  { symbol: "EURUSD", ticker: "EURUSD", name: "欧元/美元", region: "GLOBAL", category: "FX", pair: "EURUSD.FX" },
  { symbol: "USDJPY", ticker: "USDJPY", name: "美元/日元", region: "GLOBAL", category: "FX", pair: "USDJPY.FX" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "snapshot";

  try {
    switch (type) {
      case "snapshot":
        return await getMarketSnapshot();
      case "a-share":
        return await getAShareData();
      case "macro":
        return await getMacroData();
      case "all":
        return await getAllData();
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

async function getMarketSnapshot() {
  // Use unified fallback chain for all assets
  const quotes = await fetchAllQuotesWithFallback();
  
  // Categorize by region
  const usAssets = quotes.filter(q => q.region === "US");
  const cnAssets = quotes.filter(q => q.region === "CN");
  const hkAssets = quotes.filter(q => q.region === "HK");
  const globalAssets = quotes.filter(q => q.region === "GLOBAL");
  
  // Count sources
  const supabaseCount = quotes.filter(q => !q.isIndicative).length;
  const fallbackCount = quotes.filter(q => q.isIndicative && q.price !== null).length;
  
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
  });
}

async function getAShareData() {
  // First try Supabase via fallback
  const quotes = await fetchAllQuotesWithFallback();
  const cnAssets = quotes.filter(q => q.region === "CN");
  
  const hasSupabaseData = cnAssets.some(q => !q.isIndicative);
  
  if (hasSupabaseData) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      source: "supabase",
      data: cnAssets,
    });
  }
  
  // Fallback to Eastmoney
  const data = await fetchAShareWithFallback();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    source: data.length > 0 && data[0].price !== 3.856 ? "eastmoney" : "mock",
    data,
  });
}

async function getMacroData() {
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
  });
}

async function getAllData() {
  const [snapshot, macro] = await Promise.all([
    getMarketSnapshot(),
    getMacroData(),
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
        // For other assets: use ticker field (which may be Yahoo symbol like ^GSPC)
        const supabaseKey = config.pair || config.ticker;
        
        const fallbackResult = await fetchMarketQuoteWithFallback(
          supabaseKey,
          config.region,
          config.category
        );
        
        return {
          ...fallbackResult,
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
