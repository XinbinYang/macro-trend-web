import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchChinaMoneyCurveHis, buildDateTenorMap } from "@/lib/api/chinamoney-yield";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * CN Rates Daily Cron Job
 * 
 * Fetches from ChinaMoney:
 * - CYCC000: 国债收益率曲线 (Treasury)
 * - CYCC82B: AAA级中短期票据收益率曲线 (AAA CP&MTN)
 * 
 * Computes:
 * - yield_2y, yield_5y, yield_10y (from CYCC000)
 * - credit_spread_5y = AAA_5Y - Treasury_5Y (from CYCC82B - CYCC000)
 * 
 * Cadence: Daily (should run after 17:30 HKT when ChinaMoney publishes)
 */

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

// Fetch yield curve for a bond type
async function fetchYieldCurve(bondType: "CYCC000" | "CYCC82B", daysBack: number = 5) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  try {
    const resp = await fetchChinaMoneyCurveHis({
      bondType,
      startDate: startStr,
      endDate: endStr,
      termId: "1",
      pageNum: 1,
      pageSize: 500,
    });
    return buildDateTenorMap(resp);
  } catch (e) {
    console.error(`[CN Rates] Failed to fetch ${bondType}:`, e);
    return null;
  }
}

// Extract latest yield for a specific tenor (in years)
function getLatestYield(tenorMap: Map<string, Map<number, number>>, tenorYears: number): { date: string; yield: number } | null {
  const dates = Array.from(tenorMap.keys()).sort();
  if (dates.length === 0) return null;
  
  const latestDate = dates[dates.length - 1];
  const tenMap = tenorMap.get(latestDate);
  if (!tenMap) return null;
  
  const yieldVal = tenMap.get(tenorYears);
  if (yieldVal === undefined) return null;
  
  return { date: latestDate, yield: yieldVal };
}

export async function GET(req: Request) {
  try {
    // Optional: protect endpoint with a shared secret
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const got = new URL(req.url).searchParams.get("secret") || req.headers.get("x-cron-secret");
      if (got !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    console.log("[CN Rates Cron] Starting fetch from ChinaMoney...");

    // Fetch both curves in parallel
    const [treasuryMap, aaaMap] = await Promise.all([
      fetchYieldCurve("CYCC000", 5),  // Treasury
      fetchYieldCurve("CYCC82B", 5),  // AAA CP&MTN
    ]);

    if (!treasuryMap) {
      return NextResponse.json({ ok: false, error: "Failed to fetch treasury curve" }, { status: 502 });
    }

    // Extract key points
    const results: Record<string, { date: string; value: number }> = {};

    // Treasury yields
    const y2 = getLatestYield(treasuryMap, 2);
    const y5 = getLatestYield(treasuryMap, 5);
    const y10 = getLatestYield(treasuryMap, 10);

    if (y2) results.yield_2y = { date: y2.date, value: y2.yield };
    if (y5) results.yield_5y = { date: y5.date, value: y5.yield };
    if (y10) results.yield_10y = { date: y10.date, value: y10.yield };

    // Credit spread: AAA 5Y - Treasury 5Y
    if (y5 && aaaMap) {
      const aaa5 = getLatestYield(aaaMap, 5);
      if (aaa5 && aaa5.date === y5.date) {
        // Spread in basis points
        results.credit_spread_5y = {
          date: y5.date,
          value: (aaa5.yield - y5.yield) * 100, // Convert % to bp
        };
      }
    }

    // Check if we got any data
    if (Object.keys(results).length === 0) {
      return NextResponse.json({ ok: false, error: "No yield curve data retrieved" }, { status: 502 });
    }

    // Determine the common date
    const asOf = results.yield_5y?.date || results.yield_2y?.date || results.yield_10y?.date || new Date().toISOString().split("T")[0];

    // Build payload for Supabase
    const payload: Record<string, string | number> = {
      date: `${asOf}T00:00:00+00:00`,
      source: "chinamoney",
      rates_source: "ChinaMoney",
      rates_updated_at: new Date().toISOString(),
    };

    if (results.yield_2y) payload.yield_2y = results.yield_2y.value;
    if (results.yield_5y) payload.yield_5y = results.yield_5y.value;
    if (results.yield_10y) payload.yield_10y = results.yield_10y.value;
    if (results.credit_spread_5y) payload.credit_spread_5y = results.credit_spread_5y.value;

    console.log("[CN Rates Cron] Writing to Supabase:", payload);

    const sb = supabaseAdmin();
    const { error } = await sb.from("macro_cn").upsert([payload], { onConflict: "date" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ 
      ok: true, 
      asOf,
      wrote: {
        yield_2y: results.yield_2y?.value,
        yield_5y: results.yield_5y?.value,
        yield_10y: results.yield_10y?.value,
        credit_spread_5y_bp: results.credit_spread_5y?.value,
      }
    });
  } catch (e) {
    console.error("[CN Rates Cron] Error:", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
