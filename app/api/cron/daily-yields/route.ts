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

async function fetchFredLatest(seriesId: string, days: number = 10): Promise<{ date: string; value: number } | null> {
  const apiKey = requireEnv("FRED_API_KEY");
  const url = new URL(`${FRED_API_BASE}/series/observations`);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", String(days));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`FRED ${seriesId} HTTP ${res.status}`);
  const json = (await res.json()) as FredResponse;
  const obs = (json.observations || []).find((o) => o.value !== ".");
  if (!obs) return null;
  const v = Number(obs.value);
  if (!Number.isFinite(v)) return null;
  return { date: obs.date, value: v };
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

// Vercel Cron entrypoint: writes latest daily DGS2/DGS10 into macro_us.
// NOTE: This creates daily rows in macro_us (monthly indicators remain sparse). This is intentional so the dashboard
// can always show the latest yield data from the primary DB source.
export async function GET(req: Request) {
  try {
    // Optional: protect endpoint with a shared secret
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const got = new URL(req.url).searchParams.get("secret") || req.headers.get("x-cron-secret");
      if (got !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const [y2, y10] = await Promise.all([
      fetchFredLatest("DGS2"),
      fetchFredLatest("DGS10"),
    ]);

    if (!y2 && !y10) {
      return NextResponse.json({ ok: false, error: "no data" }, { status: 502 });
    }

    // Use the most recent date among returned series
    const asOf = (y2?.date && y10?.date)
      ? (y2.date > y10.date ? y2.date : y10.date)
      : (y2?.date || y10?.date || null);

    if (!asOf) {
      return NextResponse.json({ ok: false, error: "no data" }, { status: 502 });
    }

    const payload: Record<string, string | number> = {
      date: `${asOf}T00:00:00+00:00`,
      source: "fred",
      updated_at: new Date().toISOString(),
    };
    if (y2) payload.yield_2y = y2.value;
    if (y10) payload.yield_10y = y10.value;

    const sb = supabaseAdmin();
    const { error } = await sb.from("macro_us").upsert([payload], { onConflict: "date" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, asOf, wrote: payload });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
