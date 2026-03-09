import { NextResponse } from "next/server";
import { getMultipleQuotes } from "@/lib/api/market-data";

const ASSET_SYMBOLS = [
  "SPY", "QQQ", "IWM", "TLT", "GLD",
  "ASHR", "KWEB", "FXI", "EEM", "EWH",
  "GC=F", "CL=F"
];

export async function GET() {
  try {
    const quotes = await getMultipleQuotes(ASSET_SYMBOLS);
    
    if (quotes.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No data available from any source",
        data: [],
      }, { status: 503 });
    }

    // 分类数据
    const indices = quotes.filter(q => ["SPY", "QQQ", "IWM", "ASHR", "EWH"].includes(q.symbol));
    const assets = quotes.filter(q => !["SPY", "QQQ", "IWM", "ASHR", "EWH"].includes(q.symbol));

    // 统计数据源
    const sources = quotes.reduce((acc, q) => {
      acc[q.source] = (acc[q.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      sources,
      timestamp: new Date().toISOString(),
      indices,
      assets,
    });
  } catch (error) {
    console.error("[API] Market data error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
