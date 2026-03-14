import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CnPayload = {
  region: "CN";
  status: string;
  updatedAt: string;
  asOf: string | null;
  series: Record<string, { value: number | null; asOf: string | null; source: string; unit?: string }>;
  notes?: string;
};

function monthsBetween(from: string, to = new Date().toISOString().slice(0, 7)) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

interface MacroCNRow {
  date: string;
  gdp_yoy: string | null;
  cpi_yoy: string | null;
  ppi_yoy: string | null;
  pmi: string | null;
  m2_yoy: number | null;
  unemployment: string | null;
  lpr_1y: string | null;
  lpr_5y: string | null;
  source: string | null;
}

function buildCnPayload(data: MacroCNRow | null): CnPayload {
  if (!data) {
    return {
      region: "CN",
      status: "OFF",
      updatedAt: new Date().toISOString(),
      asOf: null,
      series: {},
      notes: "No CN macro data in Supabase",
    };
  }

  const asOf = data.date ? data.date.split("T")[0] : null;
  const stale = asOf ? monthsBetween(asOf) >= 2 : true;
  const status: "LIVE" | "STALE" | "OFF" = stale ? "STALE" : "LIVE";

  const series: Record<string, { value: number | null; asOf: string | null; source: string; unit?: string }> = {};

  const src = (data.source || "Supabase");

  // Map Supabase fields to API response (using frontend-compatible field names)
  if (data.gdp_yoy !== null) series.gdp_yoy = { value: parseFloat(data.gdp_yoy), asOf, source: src };
  if (data.cpi_yoy !== null) series.cpi_yoy = { value: parseFloat(data.cpi_yoy), asOf, source: src, unit: "%" };
  if (data.ppi_yoy !== null) series.ppi_yoy = { value: parseFloat(data.ppi_yoy), asOf, source: src, unit: "%" };
  // Map pmi -> pmi_mfg for frontend compatibility
  if (data.pmi !== null) series.pmi_mfg = { value: parseFloat(data.pmi), asOf, source: src };
  if (data.m2_yoy !== null) series.m2_yoy = { value: data.m2_yoy, asOf, source: src, unit: "%" };
  // Map unemployment -> unemployment_urban for frontend compatibility
  if (data.unemployment !== null) series.unemployment_urban = { value: parseFloat(data.unemployment), asOf, source: src, unit: "%" };
  if (data.lpr_1y !== null) series.lpr_1y = { value: parseFloat(data.lpr_1y), asOf, source: src, unit: "%" };
  if (data.lpr_5y !== null) series.lpr_5y = { value: parseFloat(data.lpr_5y), asOf, source: src, unit: "%" };

  // Add placeholder fields that frontend expects but don't exist in Supabase
  series.social_financing = { value: null, asOf, source: "Supabase", unit: "万亿" };

  return {
    region: "CN",
    status,
    updatedAt: new Date().toISOString(),
    asOf,
    series,
    notes: "Monthly macro snapshot from Supabase macro_cn.",
  };
}

async function getLatestCnRowWithAnyField(supabase: ReturnType<typeof getSupabaseClient>) {
  // Prefer the latest row that has at least one of the core macro fields (so a LPR-only row won't blank PMI/CPI/M2).
  const { data, error } = await supabase
    .from("macro_cn")
    .select("*")
    .or("pmi.not.is.null,cpi_yoy.not.is.null,m2_yoy.not.is.null,unemployment.not.is.null,lpr_1y.not.is.null")
    .order("date", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as MacroCNRow | null) || null;
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch latest CN macro data from Supabase.
    // IMPORTANT: choose the latest row that has at least one core macro field.
    // This avoids a fresh LPR-only row (from policy updates) making PMI/CPI/M2 look missing.
    let latest: MacroCNRow | null = null;
    try {
      latest = await getLatestCnRowWithAnyField(supabase);
    } catch (err) {
      console.error("[API/macro-cn] Supabase error:", err);
      return NextResponse.json(
        {
          success: false,
          status: "OFF",
          error: "Failed to fetch from Supabase",
        },
        {
          status: 200,
          headers: { "Cache-Control": "public, max-age=3600" },
        }
      );
    }
    
    if (!latest) {
      return NextResponse.json(
        {
          success: false,
          status: "OFF",
          error: "No CN macro data found in Supabase",
        },
        {
          status: 200,
          headers: { "Cache-Control": "public, max-age=3600" },
        }
      );
    }

    const payload = buildCnPayload(latest);
    const stale = payload.status === "STALE";

    return NextResponse.json(
      {
        success: true,
        freshness: payload.status as "LIVE" | "STALE",
        stale,
        data: payload,
      },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=3600" },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, status: "OFF", error: (e as Error).message },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
