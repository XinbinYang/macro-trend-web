// Unified Market Data API
// Combines multiple data sources with fallback mechanism

import { NextResponse } from "next/server";
import { fetchAShareWithFallback } from "@/lib/api/eastmoney-api";
import { fetchFredWithFallback, FRED_SERIES, buildFredMacroSummary } from "@/lib/api/fred-api";

// Global market snapshot
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
  // Fetch data from multiple sources in parallel
  const [aShareData, csi300, nasdaq] = await Promise.all([
    fetchAShareWithFallback(),
    fetchGlobalIndex("NASDAQ"),
    fetchGlobalIndex("SP500"),
  ]);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    sources: {
      aShare: aShareData ? "real" : "mock",
      global: nasdaq ? "real" : "mock",
    },
    data: {
      aShare: aShareData?.slice(0, 3) || [],
      global: [nasdaq, csi300].filter(Boolean),
    },
  });
}

async function getAShareData() {
  const data = await fetchAShareWithFallback();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    source: data.length > 0 && data[0].price !== 3.856 ? "real" : "mock",
    data,
  });
}

async function getMacroData() {
  // Fetch key macro indicators
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

// Mock global index data (fallback)
async function fetchGlobalIndex(index: string): Promise<{
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
} | null> {
  // In production, this would call Yahoo Finance or Alpha Vantage
  // For now, return mock data
  const mockData: Record<string, {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
  }> = {
    NASDAQ: {
      symbol: "QQQ",
      name: "纳斯达克100 ETF",
      price: 512.45,
      change: 8.25,
      changePercent: 1.64,
    },
    SP500: {
      symbol: "SPY",
      name: "标普500 ETF",
      price: 595.23,
      change: 5.02,
      changePercent: 0.85,
    },
  };

  return mockData[index] || null;
}
