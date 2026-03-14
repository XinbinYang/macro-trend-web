import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FRED_API_BASE = "https://api.stlouisfed.org/fred";

type FredObs = { date: string; value: string };
type FredResponse = { observations: FredObs[] };

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

async function fetchFredSeries(
  seriesId: string,
  limit: number
): Promise<{ date: string; value: number }[]> {
  const apiKey = requireEnv("FRED_API_KEY");
  const url = new URL(`${FRED_API_BASE}/series/observations`);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`FRED ${seriesId} HTTP ${res.status}`);
  const json = (await res.json()) as FredResponse;

  return (json.observations || [])
    .filter((o: FredObs) => o.value !== "." && Number.isFinite(Number(o.value)))
    .map((o: FredObs) => ({ date: o.date, value: Number(o.value) }))
    .reverse(); // ascending order
}

/** Compute YoY% from 13 monthly data points (index[12] vs index[0]) */
function computeYoY(series: { date: string; value: number }[]): { yoy: number; asOf: string } | null {
  if (series.length < 13) return null;
  const curr = series[series.length - 1];
  const prev = series[series.length - 13];
  if (prev.value === 0) return null;
  const yoy = ((curr.value - prev.value) / prev.value) * 100;
  return { yoy, asOf: curr.date };
}

/** Compute z-score of the last value against the series mean/std */
function zScore(series: { date: string; value: number }[]): number | null {
  if (series.length < 2) return null;
  const values = series.map((d) => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (values[values.length - 1] - mean) / std;
}

/**
 * FCI Proxy = 0.4 × z(DGS10) + 0.3 × z(VIXCLS) + 0.3 × z(DTWEXBGS)
 * Higher = tighter financial conditions
 */
function computeFciProxy(
  dgs10: { date: string; value: number }[],
  vix: { date: string; value: number }[],
  dxy: { date: string; value: number }[]
): { fci: number; asOf: string } | null {
  const z10 = zScore(dgs10);
  const zVix = zScore(vix);
  const zDxy = zScore(dxy);
  if (z10 === null || zVix === null || zDxy === null) return null;

  const fci = 0.4 * z10 + 0.3 * zVix + 0.3 * zDxy;
  // Use most recent date across series
  const asOf = [dgs10, vix, dxy]
    .map((s) => s[s.length - 1]?.date ?? "")
    .sort()
    .reverse()[0];
  return { fci, asOf };
}

/** Normalize a date to YYYY-MM-01 (month bucket) */
function toMonthBucket(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01";
}

export async function GET(req: Request) {
  try {
    // Optional CRON_SECRET guard
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const got = new URL(req.url).searchParams.get("secret") || req.headers.get("x-cron-secret");
      if (got !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const now = new Date().toISOString();

    // ── 1. M2 YoY ──────────────────────────────────────────────────────────
    const m2Series = await fetchFredSeries("M2SL", 13);
    const m2Result = computeYoY(m2Series);
    if (!m2Result) {
      return NextResponse.json({ ok: false, error: "Insufficient M2SL data for YoY" }, { status: 502 });
    }

    // ── 2. FCI Proxy ────────────────────────────────────────────────────────
    const [dgs10Series, vixSeries, dxySeries] = await Promise.all([
      fetchFredSeries("DGS10", 12),
      fetchFredSeries("VIXCLS", 12),
      fetchFredSeries("DTWEXBGS", 12),
    ]);
    const fciResult = computeFciProxy(dgs10Series, vixSeries, dxySeries);
    if (!fciResult) {
      return NextResponse.json({ ok: false, error: "Insufficient data for FCI proxy" }, { status: 502 });
    }

    // ── 3. Upsert ───────────────────────────────────────────────────────────
    const sb = supabaseAdmin();

    // M2: upsert into the month bucket of the FRED observation date
    const m2Date = toMonthBucket(m2Result.asOf);
    const { error: m2Err } = await sb.from("macro_us").upsert(
      [{
        date: `${m2Date}T00:00:00+00:00`,
        m2_yoy: m2Result.yoy,
        m2_source: "FRED-M2SL",
        m2_updated_at: now,
      }],
      { onConflict: "date" }
    );
    if (m2Err) throw new Error(`M2 upsert: ${m2Err.message}`);

    // FCI: upsert into the month bucket of the most recent series date
    const fciDate = toMonthBucket(fciResult.asOf);
    const { error: fciErr } = await sb.from("macro_us").upsert(
      [{
        date: `${fciDate}T00:00:00+00:00`,
        fci: fciResult.fci,
        fci_source: "FRED-proxy-v1",
        fci_updated_at: now,
      }],
      { onConflict: "date" }
    );
    if (fciErr) throw new Error(`FCI upsert: ${fciErr.message}`);

    return NextResponse.json({
      ok: true,
      m2: { asOf: m2Date, yoy: m2Result.yoy },
      fci: { asOf: fciDate, value: fciResult.fci, source: "FRED-proxy-v1" },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
