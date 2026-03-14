import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// PBoC LPR (Truth) - manual seed via env for now.
// Later we can replace with an AkShare / official site fetcher, but the *source of truth* remains PBoC.
//
// Required env:
// - PBOC_LPR_1Y
// - PBOC_LPR_5Y
// Optional:
// - PBOC_LPR_ASOF (YYYY-MM-DD), defaults to today
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const got = new URL(req.url).searchParams.get("secret") || req.headers.get("x-cron-secret");
      if (got !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const lpr1y = Number(requireEnv("PBOC_LPR_1Y"));
    const lpr5y = Number(requireEnv("PBOC_LPR_5Y"));
    if (!Number.isFinite(lpr1y) || !Number.isFinite(lpr5y)) {
      throw new Error("Invalid PBOC_LPR_1Y / PBOC_LPR_5Y");
    }

    const asOf = process.env.PBOC_LPR_ASOF || new Date().toISOString().slice(0, 10);

    const payload = {
      date: `${asOf}T00:00:00+00:00`,
      lpr_1y: lpr1y,
      lpr_5y: lpr5y,
      source: "pboc",
      updated_at: new Date().toISOString(),
    };

    const sb = supabaseAdmin();
    const { error } = await sb.from("macro_cn").upsert([payload], { onConflict: "date" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, asOf, wrote: payload });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
