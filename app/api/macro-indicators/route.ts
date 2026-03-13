import { NextResponse } from "next/server";
import { FRED_SERIES, getLatestFredValue, getFredYoY } from "@/lib/api/fred-api";

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
  debug?: {
    hasFredKey: boolean;
    fredKeyLength?: number;
    fredProbe?: {
      ok: boolean;
      status?: number;
      error?: string;
    };
  };
}

function offIndicator(id: string, name: string, unit: string): MacroIndicator {
  return { id, name, unit, value: null, status: "OFF", asOf: null, source: "OFF" };
}

export async function GET() {
  const updatedAt = new Date().toISOString();
  const key = process.env.FRED_API_KEY || "";
  const hasFredKey = Boolean(key);

  // If key missing, be explicit OFF (not mock pretending)
  // NOTE: On Vercel, env var updates may need a redeploy to reach the serverless runtime.
  if (!hasFredKey) {
    const indicators: MacroIndicator[] = [
      offIndicator("us_ism_pmi", "US ISM PMI", "idx"),
      offIndicator("us_fedfunds", "US Fed Funds", "%"),
      offIndicator("us_2y", "US 2Y", "%"),
      offIndicator("us_10y", "US 10Y", "%"),
      offIndicator("us_cpi_yoy", "US CPI YoY", "%"),
      offIndicator("us_core_cpi_yoy", "US Core CPI YoY", "%"),
      offIndicator("us_cpi", "US CPI (Index)", "idx"),
      offIndicator("us_unrate", "US Unemployment", "%"),
    ];

    const res: MacroIndicatorsResponse = {
      updatedAt,
      indicators,
      debug: { hasFredKey, fredKeyLength: key.length },
    };
    return NextResponse.json(res, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const seriesMap: Array<{ id: string; name: string; unit: string; series: string; transform?: "yoy" }> = [
    { id: "us_ism_pmi", name: "US ISM PMI", unit: "idx", series: FRED_SERIES.ISM_PMI },
    { id: "us_fedfunds", name: "US Fed Funds", unit: "%", series: FRED_SERIES.FED_FUNDS },
    { id: "us_2y", name: "US 2Y", unit: "%", series: FRED_SERIES.TREASURY_2Y },
    { id: "us_10y", name: "US 10Y", unit: "%", series: FRED_SERIES.TREASURY_10Y },

    // Inflation: expose YoY% directly to avoid front-end mislabeling index level
    { id: "us_cpi_yoy", name: "US CPI YoY", unit: "%", series: FRED_SERIES.CPI, transform: "yoy" },
    { id: "us_core_cpi_yoy", name: "US Core CPI YoY", unit: "%", series: FRED_SERIES.CORE_CPI, transform: "yoy" },

    // Still keep index level available for reference
    { id: "us_cpi", name: "US CPI (Index)", unit: "idx", series: FRED_SERIES.CPI },

    { id: "us_unrate", name: "US Unemployment", unit: "%", series: FRED_SERIES.UNEMPLOYMENT },
  ];

  // Quick probe: verify the key works (helps debug "env is set but still OFF")
  type FredProbe = { ok: boolean; status?: number; error?: string };
  let fredProbe: FredProbe | undefined = undefined;
  try {
    const probeUrl = new URL("https://api.stlouisfed.org/fred/series/observations");
    probeUrl.searchParams.set("series_id", FRED_SERIES.UNEMPLOYMENT);
    probeUrl.searchParams.set("api_key", key);
    probeUrl.searchParams.set("file_type", "json");
    probeUrl.searchParams.set("limit", "1");
    const probeRes = await fetch(probeUrl.toString(), {
      headers: { "User-Agent": "macro-trend-web" },
      // do not cache probes
      cache: "no-store",
    });
    fredProbe = { ok: probeRes.ok, status: probeRes.status };
  } catch (e) {
    fredProbe = { ok: false, error: (e as Error).message };
  }

  const values = await Promise.all(
    seriesMap.map(async (s) => {
      if (s.transform === "yoy") {
        const yoy = await getFredYoY(s.series);
        if (!yoy) return offIndicator(s.id, s.name, s.unit);
        return {
          id: s.id,
          name: s.name,
          unit: s.unit,
          value: yoy.yoy,
          asOf: yoy.asOf,
          status: "LIVE" as const,
          source: "FRED" as const,
        };
      }

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
    debug: { hasFredKey, fredKeyLength: key.length, fredProbe },
  };

  return NextResponse.json(res, {
    status: 200,
    headers: {
      // daily data, but keep page snappy
      "Cache-Control": "public, max-age=60",
    },
  });
}
