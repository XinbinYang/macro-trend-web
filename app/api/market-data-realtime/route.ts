import { NextResponse } from "next/server";
import { getMultipleYahooQuotes, testYahooConnection } from "@/lib/api/yahoo-api";

const ASSET_SYMBOLS = ["SPY", "QQQ", "IWM", "TLT", "GLD", "ASHR", "KWEB", "FXI", "GC=F", "CL=F", "EEM", "EWH"];

export async function GET() {
  try {
    const connected = await testYahooConnection();
    if (!connected) {
      return NextResponse.json({ success: false, error: "Yahoo API not available" }, { status: 503 });
    }
    const quotes = await getMultipleYahooQuotes(ASSET_SYMBOLS);
    const indices = quotes.filter(q => ["SPY", "QQQ", "IWM", "ASHR", "EWH"].includes(q.symbol));
    const assets = quotes.filter(q => !["SPY", "QQQ", "IWM", "ASHR", "EWH"].includes(q.symbol));
    return NextResponse.json({
      success: true, source: "Yahoo Finance", timestamp: new Date().toISOString(), indices, assets,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
