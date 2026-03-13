import { NextResponse } from "next/server";
import { getHistoricalData } from "@/lib/api/supabase-assets";
import { fetchIndexKline } from "@/lib/api/eastmoney-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const days = parseInt(searchParams.get("days") || "90", 10);

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: "Symbol is required" },
      { status: 400 }
    );
  }

  try {
    // === Step 1: Try Supabase ===
    const data = await getHistoricalData(symbol, days);
    
    if (data && data.length > 0) {
      // Check if we have actual data (not all nulls)
      const hasValidData = data.some(d => d.close !== null);
      
      if (hasValidData) {
        return NextResponse.json({
          success: true,
          source: "supabase",
          isIndicative: false,
          symbol,
          days,
          data,
        });
      }
    }

    // === Step 2: Try Eastmoney for CN indices ===
    const cnIndexMap: Record<string, string> = {
      "000300.SH": "000300",
      "000905.SH": "000905",
      "000016.SH": "000016",
      "399006.SZ": "399006",
      "000688.SH": "000688",
      "HSI": "HSI",
    };

    const eastmoneyCode = cnIndexMap[symbol];
    
    if (eastmoneyCode) {
      try {
        // Try CN index
        const indexData = await fetchIndexKline(eastmoneyCode, days);
        
        if (indexData && indexData.length > 0) {
          return NextResponse.json({
            success: true,
            source: "eastmoney",
            isIndicative: true,
            symbol,
            days,
            data: indexData.map(d => ({ date: d.date, close: d.close })),
            disclaimer: "Data from Eastmoney fallback - indicative only",
          });
        }
      } catch (e) {
        console.error("[historical-data] Eastmoney fallback error:", e);
      }
    }

    // === Step 3: Try Yahoo Finance (for US/Global assets) ===
    // This would require adding Yahoo Finance API integration
    // For now, return what we have
    
    // Check if we have any data from Supabase (even if stale)
    if (data && data.length > 0) {
      return NextResponse.json({
        success: true,
        source: "supabase-stale",
        isIndicative: true,
        symbol,
        days,
        data,
        disclaimer: "Stale data from Supabase - indicative only",
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "No historical data available for this symbol",
        isIndicative: true,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("[API] Historical data error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
