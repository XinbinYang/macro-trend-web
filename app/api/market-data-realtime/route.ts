import { NextResponse } from "next/server";

// 简单的 Yahoo Finance API 路由
export async function GET() {
  try {
    const symbols = ["SPY", "QQQ", "GLD", "ASHR"];
    const results = [];
    
    for (const symbol of symbols) {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        
        if (!res.ok) continue;
        
        const data = await res.json();
        const meta = data.chart?.result?.[0]?.meta;
        
        if (meta) {
          const price = meta.regularMarketPrice || meta.previousClose;
          const prev = meta.previousClose || price;
          results.push({
            symbol,
            name: meta.shortName || symbol,
            price,
            change: price - prev,
            changePercent: prev > 0 ? ((price - prev) / prev) * 100 : 0,
          });
        }
      } catch (e) {
        console.error(`Failed to fetch ${symbol}:`, e);
      }
    }
    
    return NextResponse.json({
      success: true,
      source: "Yahoo Finance",
      timestamp: new Date().toISOString(),
      data: results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
