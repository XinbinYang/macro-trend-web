import { NextResponse } from "next/server";
import { FRED_SERIES, getLatestFredValue } from "@/lib/api/fred-api";

export type MacroIndicatorStatus = "LIVE" | "OFF";

export interface MacroIndicator {
  id: string;
  name: string;
  value: number | null;
  unit: string;
  status: MacroIndicatorStatus;
  asOf: string | null;
  source: "FRED" | "OFF";
}

export interface MacroIndicatorsResponse {
  updatedAt: string;
  indicators: MacroIndicator[];
}

function offIndicator(id: string, name: string, unit: string): MacroIndicator {
  return { id, name, unit, value: null, status: "OFF", asOf: null, source: "OFF" };
}

export async function GET() {
  const updatedAt = new Date().toISOString();

  // If key missing, be explicit OFF (not mock pretending)
  // NOTE: On Vercel, env var updates may need a redeploy to reach the serverless runtime.
  if (!process.env.FRED_API_KEY) {
    const indicators: MacroIndicator[] = [
      offIndicator("us_fedfunds", "US Fed Funds", "%"),
      offIndicator("us_2y", "US 2Y", "%"),
      offIndicator("us_10y", "US 10Y", "%"),
      offIndicator("us_cpi", "US CPI (Index)", "idx"),
      offIndicator("us_unrate", "US Unemployment", "%"),
    ];

    const res: MacroIndicatorsResponse = { updatedAt, indicators };
    return NextResponse.json(res, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const seriesMap: Array<{ id: string; name: string; unit: string; series: string }> = [
    { id: "us_fedfunds", name: "US Fed Funds", unit: "%", series: FRED_SERIES.FED_FUNDS },
    { id: "us_2y", name: "US 2Y", unit: "%", series: FRED_SERIES.TREASURY_2Y },
    { id: "us_10y", name: "US 10Y", unit: "%", series: FRED_SERIES.TREASURY_10Y },
    { id: "us_cpi", name: "US CPI (Index)", unit: "idx", series: FRED_SERIES.CPI },
    { id: "us_unrate", name: "US Unemployment", unit: "%", series: FRED_SERIES.UNEMPLOYMENT },
  ];

  const values = await Promise.all(
    seriesMap.map(async (s) => {
      const latest = await getLatestFredValue(s.series);
      if (!latest) return offIndicator(s.id, s.name, s.unit);
      return {
        id: s.id,
        name: s.name,
        unit: s.unit,
        value: latest.value,
        asOf: latest.date,
        status: "LIVE" as const,
        source: "FRED" as const,
      };
    })
  );

  const res: MacroIndicatorsResponse = {
    updatedAt,
    indicators: values,
  };

  return NextResponse.json(res, {
    status: 200,
    headers: {
      // daily data, but keep page snappy; let the upstream revalidate handle caching
      "Cache-Control": "public, max-age=60",
    },
  });
}
