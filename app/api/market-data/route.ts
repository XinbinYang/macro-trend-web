// Unified Market Data API
// Primary: Supabase (assets_equity, assets_bond, assets_commodity, assets_fx)
// Fallback: Yahoo, Eastmoney, FRED with "indicative" flag

import { NextResponse } from "next/server";
import { fetchAShareWithFallback } from "@/lib/api/eastmoney-api";
import { fetchFredWithFallback, FRED_SERIES, buildFredMacroSummary } from "@/lib/api/fred-api";
import { fetchMarketQuoteWithFallback } from "@/lib/api/fallback-utils";

// Asset config - maps frontend symbols to Supabase tickers
interface AssetConfigItem {
  symbol: string;
  ticker: string;
  name: string;
  region: "US" | "CN" | "HK" | "GLOBAL";
  category: "EQUITY" | "COMMODITY" | "BOND" | "FX";
  pair?: string;
}

const ASSET_CONFIG: AssetConfigItem[] = [
  // US Equities
  { symbol: "^GSPC", ticker: "SP500", name: "S&P 500", region: "US", category: "EQUITY" },
  { symbol: "^NDX", ticker: "NDX", name: "纳斯达克100", region: "US", category: "EQUITY" },
  { symbol: "^DJI", ticker: "DJI", name: "道指30", region: "US", category: "EQUITY" },
  
  // CN Equities
  { symbol: "000300.SH", ticker: "HS300", name: "沪深300", region: "CN", category: "EQUITY" },
  { symbol: "000905.SH", ticker: "000905.SH", name: "中证500", region: "CN", category: "EQUITY" },
  { symbol: "000016.SH", ticker: "000016.SH", name: "上证50", region: "CN", category: "EQUITY" },
  { symbol: "399006.SZ", ticker: "399006.SZ", name: "创业板指", region: "CN", category: "EQUITY" },
  { symbol: "000688.SH", ticker: "000688.SH", name: "科创50", region: "CN", category: "EQUITY" },
  
  // HK Equities
  { symbol: "HSI", ticker: "HSI", name: "恒生指数", region: "HK", category: "EQUITY" },
  
  // Commodities
  { symbol: "GC=F", ticker: "GC", name: "COMEX黄金期货", region: "GLOBAL", category: "COMMODITY" },
  { symbol: "CL=F", ticker: "CL", name: "WTI原油期货", region: "GLOBAL", category: "COMMODITY" },
  { symbol: "DJP", ticker: "DJP", name: "道琼斯商品指数总回报", region: "GLOBAL", category: "COMMODITY" },
  { symbol: "GLD", ticker: "GLD", name: "黄金ETF", region: "GLOBAL", category: "COMMODITY" },
  
  // Bonds (from assets_equity table with US_XXY tickers)
  { symbol: "US_10Y", ticker: "US_10Y", name: "美国10年期国债", region: "US", category: "BOND" },
  { symbol: "US_2Y", ticker: "US_2Y", name: "美国2年期国债", region: "US", category: "BOND" },
  { symbol: "US_5Y", ticker: "US_5Y", name: "美国5年期国债", region: "US", category: "BOND" },
  
  // FX
  { symbol: "DXY", ticker: "DXY", name: "美元指数", region: "GLOBAL", category: "FX", pair: "USDX.FX" },
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
        const fallbackResult = await fetchMarketQuoteWithFallback(
          config.ticker || config.symbol,
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
