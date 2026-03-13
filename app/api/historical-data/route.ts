import { NextResponse } from "next/server";
import { getHistoricalData } from "@/lib/api/supabase-assets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const days = parseInt(searchParams.get("days") || "90", 10); // Default to 90 days (approx 3 months)

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: "Symbol is required" },
      { status: 400 }
    );
  }

  try {
    // Primary: Try Supabase
    const data = await getHistoricalData(symbol, days);
    
    if (data.length > 0) {
      return NextResponse.json({
        success: true,
        source: "supabase",
        symbol,
        days,
        data,
      });
    }

    // Fallback: Try original historical data source
    try {
      const { getChartData } = await import("@/lib/api/historical-data");
      const fallbackData = await getChartData(symbol, days);
      
      if (fallbackData.length > 0) {
        return NextResponse.json({
          success: true,
          source: "indicative",
          symbol,
          days,
          data: fallbackData,
          disclaimer: "Data from fallback source - indicative only",
        });
      }
    } catch (fallbackError) {
      console.error("[API/historical-data] Fallback error:", fallbackError);
    }

    return NextResponse.json(
      { success: false, error: "No historical data available" },
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
