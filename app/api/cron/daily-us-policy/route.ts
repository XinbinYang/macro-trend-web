import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchFredSeries, getFredYoY, FRED_SERIES } from "@/lib/api/fred-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * US Policy & Inflation Daily Cron Job
 * 
 * Fetches from FRED:
 * - SOFR: Secured Overnight Financing Rate (daily)
 * - Core PCE YoY: Fed's preferred inflation metric (monthly, computed from index)
 * 
 * Cadence: Daily (should run after FRED publishes latest data, ~16:00 ET / 04:00 HKT+1)
 * But for practical purposes, run at 18:00 HKT (workday evenings)
 */

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

// Fetch latest SOFR (daily)
async function fetchLatestSOFR(): Promise<{ date: string; value: number } | null> {
  try {
    // SOFR is daily, get last 3 days to ensure we have latest
    const data = await fetchFredSeries(FRED_SERIES.SOFR, 3);
    if (!data || data.length === 0) return null;
    return data[data.length - 1]; // Latest
  } catch (e) {
    console.error("[US Policy] Failed to fetch SOFR:", e);
    return null;
  }
}

// Fetch latest Core PCE YoY (computed from index)
async function fetchLatestCorePCEYoY(): Promise<{ date: string; value: number } | null> {
  try {
    const data = await getFredYoY(FRED_SERIES.CORE_PCE);
    if (!data) return null;
    return { date: data.asOf, value: data.yoy };
  } catch (e) {
    console.error("[US Policy] Failed to fetch Core PCE YoY:", e);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    // Optional: protect endpoint with a shared secret
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const got = new URL(req.url).searchParams.get("secret") || req.headers.get("x-cron-secret");
      if (got !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    console.log("[US Policy Cron] Starting fetch from FRED...");

    // Fetch both indicators in parallel
    const [sofrData, pceData] = await Promise.all([
      fetchLatestSOFR(),
      fetchLatestCorePCEYoY(),
    ]);

    const results: Record<string, { date: string; value: number }> = {};

    if (sofrData) {
      results.sofr = sofrData;
    }

    if (pceData) {
      results.core_pce_yoy = pceData;
    }

    // Check if we got any data
    if (Object.keys(results).length === 0) {
      return NextResponse.json({ ok: false, error: "No US policy data retrieved from FRED" }, { status: 502 });
    }

    // Determine the common date (use SOFR date if available, else PCE date, else today)
    const asOf = results.sofr?.date || results.core_pce_yoy?.date || new Date().toISOString().split("T")[0];

    // Build payload for Supabase
    const payload: Record<string, string | number> = {
      date: `${asOf}T00:00:00+00:00`,
      source: "fred",
      policy_source: "FRED",
      policy_updated_at: new Date().toISOString(),
    };

    if (results.sofr) payload.sofr = results.sofr.value;
    if (results.core_pce_yoy) payload.core_pce_yoy = results.core_pce_yoy.value;

    console.log("[US Policy Cron] Writing to Supabase:", payload);

    const sb = supabaseAdmin();
    const { error } = await sb.from("macro_us").upsert([payload], { onConflict: "date" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ 
      ok: true, 
      asOf,
      wrote: {
        sofr: results.sofr?.value,
        core_pce_yoy: results.core_pce_yoy?.value,
      }
    });
  } catch (e) {
    console.error("[US Policy Cron] Error:", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
