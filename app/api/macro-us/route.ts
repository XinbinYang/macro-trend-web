import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

function monthsBetween(from: string, to = new Date().toISOString().slice(0, 7)) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

interface MacroUSRow {
  date: string;
  gdp_qoq: number | null;
  gdp_yoy: string | null;
  cpi_yoy: string | null;
  core_cpi_yoy: string | null;
  ppi_yoy: string | null;
  ism_manufacturing: string | null;
  ism_services: string | null;
  unemployment_rate: string | null;
  nonfarm_payrolls: string | null;
  fed_funds_rate: string | null;
  yield_10y: string | null;
  yield_2y: string | null;
  dxy: string | null;
  consumer_confidence: string | null;
  source: string | null;
}

function buildUsPayload(data: MacroUSRow | null) {
  if (!data) {
    return {
      region: "US",
      status: "OFF",
      updatedAt: new Date().toISOString(),
      asOf: null,
      latest: null,
      notes: "No US macro data in Supabase",
    };
  }
  
  const asOf = data.date ? data.date.split('T')[0] : null;
  const stale = asOf ? monthsBetween(asOf) >= 2 : true;
  const status: "LIVE" | "STALE" | "OFF" = stale ? "STALE" : "LIVE";
  
  // Sanitize: convert 0 to null
  const sanitize = (v: string | number | null): number | null => {
    if (v === 0 || v === "0" || v === null) return null;
    return typeof v === 'string' ? parseFloat(v) : v;
  };
  
  return {
    region: "US",
    status,
    updatedAt: new Date().toISOString(),
    asOf,
    latest: {
      date: data.date,
      gdp_qoq: sanitize(data.gdp_qoq),
      gdp_yoy: sanitize(data.gdp_yoy) !== null ? String(sanitize(data.gdp_yoy)) : null,
      cpi_yoy: sanitize(data.cpi_yoy) !== null ? String(sanitize(data.cpi_yoy)) : null,
      core_cpi_yoy: sanitize(data.core_cpi_yoy) !== null ? String(sanitize(data.core_cpi_yoy)) : null,
      ppi_yoy: sanitize(data.ppi_yoy) !== null ? String(sanitize(data.ppi_yoy)) : null,
      ism_manufacturing: sanitize(data.ism_manufacturing) !== null ? String(sanitize(data.ism_manufacturing)) : null,
      ism_services: sanitize(data.ism_services) !== null ? String(sanitize(data.ism_services)) : null,
      unemployment_rate: sanitize(data.unemployment_rate) !== null ? String(sanitize(data.unemployment_rate)) : null,
      nonfarm_payrolls: sanitize(data.nonfarm_payrolls) !== null ? String(sanitize(data.nonfarm_payrolls)) : null,
      fed_funds_rate: sanitize(data.fed_funds_rate) !== null ? String(sanitize(data.fed_funds_rate)) : null,
      yield_10y: sanitize(data.yield_10y) !== null ? String(sanitize(data.yield_10y)) : null,
      yield_2y: sanitize(data.yield_2y) !== null ? String(sanitize(data.yield_2y)) : null,
      dxy: sanitize(data.dxy) !== null ? String(sanitize(data.dxy)) : null,
      consumer_confidence: sanitize(data.consumer_confidence) !== null ? String(sanitize(data.consumer_confidence)) : null,
      source: data.source,
    },
    notes: "Monthly macro snapshot from Supabase macro_us (display layer).",
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Filter out placeholder data (date = 2099-...)
    const { data, error } = await supabase
      .from("macro_us")
      .select("*")
      .neq("date", "2099-03-31T00:00:00+00:00")
      .order("date", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    const latest = (data?.[0] as MacroUSRow) || null;
    const payload = buildUsPayload(latest);
    const stale = payload.status === "STALE";

    return NextResponse.json(
      {
        success: true,
        freshness: payload.status,
        stale,
        data: payload,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 200 });
  }
}
