import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force this API route to run dynamically on every request (avoid Next static optimization)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export type MacroIndicatorStatus = "LIVE" | "STALE" | "OFF";

type QualityTag = "Truth" | "Indicative";

type Indicator = {
  id: string;
  name: string;
  value: number | null;
  unit: "%" | "idx" | "level";
  status: MacroIndicatorStatus;
  asOf: string | null;
  updatedAt: string;
  source: string;
  quality_tag: QualityTag;
  is_stale: boolean;
};

type SupabaseMacroUS = {
  date: string;
  cpi_yoy: string | null;
  core_cpi_yoy: string | null;
  ism_manufacturing: string | null;
  unemployment_rate: string | null;
  fed_funds_rate: string | null;
  yield_10y: string | null;
  yield_2y: string | null;
  source: string | null;
  updated_at: string | null;
};

type SupabaseMacroCN = {
  date: string;
  cpi_yoy: string | null;
  pmi: string | null;
  m2_yoy: number | null;
  unemployment: string | null;
  lpr_1y: string | null;
  source: string | null;
  updated_at: string | null;
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function monthKey(isoDate: string) {
  return isoDate.slice(0, 7); // YYYY-MM
}

function monthsDiff(a: string, b: string) {
  // a,b are YYYY-MM
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (ay - by) * 12 + (am - bm);
}

function isMacroMonthlyStale(asOf: string | null) {
  if (!asOf) return true;
  // Allow 1-month delay (release lag). stale if older than last month.
  const now = new Date();
  const cur = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const as = monthKey(asOf);
  return monthsDiff(cur, as) > 1;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  if (s === "0" || s === "0.0") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function qualityTagFromSource(source: string): QualityTag {
  const s = source.toLowerCase();
  if (s.includes("master")) return "Truth";
  if (s.includes("akshare")) return "Truth";
  // uploaded_file is not part of strict truth layer; treat as indicative display.
  return "Indicative";
}

function makeIndicator(
  id: string,
  name: string,
  unit: Indicator["unit"],
  value: number | null,
  asOf: string | null,
  updatedAt: string,
  source: string
): Indicator {
  const stale = isMacroMonthlyStale(asOf);
  const status: MacroIndicatorStatus = value === null ? "OFF" : stale ? "STALE" : "LIVE";
  return {
    id,
    name,
    unit,
    value,
    asOf,
    updatedAt,
    source,
    quality_tag: qualityTagFromSource(source),
    is_stale: stale,
    status,
  };
}

export async function GET() {
  const updatedAt = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    // Explicit OFF if not configured
    const indicators: Indicator[] = [
      makeIndicator("us_ism_pmi", "US ISM PMI", "idx", null, null, updatedAt, "OFF"),
      makeIndicator("us_cpi_yoy", "US CPI YoY", "%", null, null, updatedAt, "OFF"),
      makeIndicator("cn_pmi_mfg", "CN PMI (Mfg)", "idx", null, null, updatedAt, "OFF"),
      makeIndicator("cn_cpi_yoy", "CN CPI YoY", "%", null, null, updatedAt, "OFF"),
    ];

    return NextResponse.json(
      { updatedAt, indicators, debug: { supabaseConfigured: false } },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Latest rows
  const usRes = await supabase.from("macro_us").select("*").order("date", { ascending: false }).limit(1);
  const cnRes = await supabase.from("macro_cn").select("*").order("date", { ascending: false }).limit(1);

  const us = (usRes.data?.[0] as SupabaseMacroUS | undefined) || undefined;
  const cn = (cnRes.data?.[0] as SupabaseMacroCN | undefined) || undefined;

  const usAsOf = us?.date ? us.date.slice(0, 10) : null;
  const cnAsOf = cn?.date ? cn.date.slice(0, 10) : null;

  const indicators: Indicator[] = [
    // Growth
    makeIndicator("us_ism_pmi", "US ISM PMI", "idx", toNum(us?.ism_manufacturing), usAsOf, updatedAt, us?.source || "supabase"),
    makeIndicator("cn_pmi_mfg", "CN PMI (Mfg)", "idx", toNum(cn?.pmi), cnAsOf, updatedAt, cn?.source || "supabase"),

    // Inflation
    makeIndicator("us_cpi_yoy", "US CPI YoY", "%", toNum(us?.cpi_yoy), usAsOf, updatedAt, us?.source || "supabase"),
    makeIndicator("us_core_cpi_yoy", "US Core CPI YoY", "%", toNum(us?.core_cpi_yoy), usAsOf, updatedAt, us?.source || "supabase"),
    makeIndicator("cn_cpi_yoy", "CN CPI YoY", "%", toNum(cn?.cpi_yoy), cnAsOf, updatedAt, cn?.source || "supabase"),

    // Policy
    makeIndicator("us_policy_rate", "US Policy Rate", "%", toNum(us?.fed_funds_rate), usAsOf, updatedAt, us?.source || "supabase"),
    makeIndicator("cn_lpr_1y", "CN LPR 1Y", "%", toNum(cn?.lpr_1y), cnAsOf, updatedAt, cn?.source || "supabase"),

    // Liquidity / Rates
    makeIndicator("us_10y_yield", "US 10Y", "%", toNum(us?.yield_10y), usAsOf, updatedAt, us?.source || "supabase"),
    makeIndicator("us_2y_yield", "US 2Y", "%", toNum(us?.yield_2y), usAsOf, updatedAt, us?.source || "supabase"),
    makeIndicator("cn_m2_yoy", "CN M2 YoY", "%", toNum(cn?.m2_yoy), cnAsOf, updatedAt, cn?.source || "supabase"),
    makeIndicator("cn_unemployment", "CN Unemployment", "%", toNum(cn?.unemployment), cnAsOf, updatedAt, cn?.source || "supabase"),
    makeIndicator("us_unemployment", "US Unemployment", "%", toNum(us?.unemployment_rate), usAsOf, updatedAt, us?.source || "supabase"),
  ];

  return NextResponse.json(
    {
      updatedAt,
      indicators,
      debug: {
        supabaseConfigured: true,
        usError: usRes.error?.message,
        cnError: cnRes.error?.message,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
