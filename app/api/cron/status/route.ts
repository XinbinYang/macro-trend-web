import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function supabaseReadClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key);
}

function cronHealth(label: string, date: string | null, updatedAt: string | null) {
  if (!date) return { label, status: "NO_DATA" as const, date: null, updatedAt: null, ageDays: null };
  const d = new Date(date).getTime();
  const ageDays = Number.isFinite(d) ? Math.round((Date.now() - d) / 86400000) : null;
  const status = ageDays !== null && ageDays <= 7 ? "OK" : "STALE";
  return { label, status: status as "OK" | "STALE", date: String(date).slice(0, 10), updatedAt, ageDays };
}

export async function GET() {
  try {
    const sb = supabaseReadClient();

    // 1) US Yields (daily-yields cron)
    const { data: yieldRow, error: yieldErr } = await sb
      .from("macro_us")
      .select("date,yield_2y,yield_10y,source,updated_at")
      .or("yield_2y.not.is.null,yield_10y.not.is.null")
      .order("date", { ascending: false })
      .limit(1);
    if (yieldErr) throw new Error(yieldErr.message);
    const yld = yieldRow?.[0] as { date?: string; updated_at?: string } | undefined;

    // 2) US Policy (daily-us-policy cron)
    const { data: policyRow, error: policyErr } = await sb
      .from("macro_us")
      .select("date,sofr,core_pce_yoy,policy_source,policy_updated_at")
      .or("sofr.not.is.null,core_pce_yoy.not.is.null")
      .order("date", { ascending: false })
      .limit(1);
    if (policyErr) throw new Error(policyErr.message);
    const pol = policyRow?.[0] as { date?: string; policy_updated_at?: string } | undefined;

    // 3) CN Rates (daily-cn-rates cron)
    const { data: cnRow, error: cnErr } = await sb
      .from("macro_cn")
      .select("date,yield_2y,yield_10y,credit_spread_5y,rates_source,rates_updated_at")
      .or("yield_2y.not.is.null,yield_10y.not.is.null")
      .order("date", { ascending: false })
      .limit(1);
    if (cnErr) throw new Error(cnErr.message);
    const cn = cnRow?.[0] as { date?: string; rates_updated_at?: string } | undefined;

    const crons = [
      cronHealth("daily-yields (US)", yld?.date ?? null, yld?.updated_at ?? null),
      cronHealth("daily-us-policy (US SOFR+PCE)", pol?.date ?? null, pol?.policy_updated_at ?? null),
      cronHealth("daily-cn-rates (CN Curve+Spread)", cn?.date ?? null, cn?.rates_updated_at ?? null),
    ];

    // 4) Regime Snapshot (daily-regime-snapshot cron)
    let regimeSnap = cronHealth("Regime Snapshot", null, null);
    try {
      const { data: regimeRow } = await sb
        .from("macro_regime_snapshots")
        .select("snapshot_date,regime,confidence,created_at")
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (regimeRow) {
        regimeSnap = cronHealth(
          "Regime Snapshot",
          regimeRow.snapshot_date,
          regimeRow.created_at
        );
      }
    } catch (err) {
      // 表不存在时优雅降级
      console.warn("[cron-status] Regime Snapshot check failed:", (err as Error).message);
    }

    crons.push(regimeSnap);

    const allOk = crons.every(c => c.status === "OK");

    return NextResponse.json(
      {
        ok: true,
        healthy: allOk,
        crons,
        note: "Cron health inferred from freshest rows in macro_us / macro_cn.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
