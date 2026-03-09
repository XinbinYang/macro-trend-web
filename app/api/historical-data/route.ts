import { NextResponse } from "next/server";
import { getChartData } from "@/lib/api/historical-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const days = parseInt(searchParams.get("days") || "30", 10);

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: "Symbol is required" },
      { status: 400 }
    );
  }

  try {
    const data = await getChartData(symbol, days);
    
    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: "No historical data available" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      symbol,
      days,
      data,
    });
  } catch (error) {
    console.error("[API] Historical data error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
