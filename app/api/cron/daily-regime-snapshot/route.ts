import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xmdvozykqwolmfaycgyz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function sbHeaders() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  return {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Prefer": "return=representation,resolution=merge-duplicates",
  };
}

export async function GET() {
  try {
    // 1. 从 macro-state API 获取当前宏观状态
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://macro-trend-web.vercel.app";
    const res = await fetch(`${base}/api/macro-state?no_cache=1`, { cache: "no-store" });
    if (!res.ok) throw new Error(`macro-state fetch failed: ${res.status}`);
    const json = await res.json();
    const data = json?.data ?? json;

    if (!data || typeof data.regime !== "string") {
      throw new Error("Invalid macro-state response");
    }

    const snapshotDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD HKT 近似

    // 2. 构建快照记录
    const record = {
      snapshot_date: snapshotDate,
      regime: data.regime,
      score: data.score ?? null,
      confidence: data.confidence ?? null,
      dimensions: data.dimensions ?? null,
      raw_snapshot: data,
    };

    // 3. Upsert 到 Supabase（按 snapshot_date 去重）
    const upsertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/macro_regime_snapshots`,
      {
        method: "POST",
        headers: sbHeaders(),
        body: JSON.stringify(record),
      }
    );

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      // 表不存在时优雅降级，不 crash
      if (errText.includes("does not exist") || errText.includes("42P01")) {
        return NextResponse.json({
          success: false,
          error: "Table macro_regime_snapshots does not exist. Please create it in Supabase Dashboard.",
          sql: "CREATE TABLE IF NOT EXISTS macro_regime_snapshots (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, snapshot_date date NOT NULL UNIQUE, regime text NOT NULL, score numeric, confidence integer, dimensions jsonb, raw_snapshot jsonb, created_at timestamptz DEFAULT now());",
          snapshotDate,
          regime: data.regime,
        }, { status: 200 }); // 返回 200 避免 Vercel 报 cron 失败
      }
      throw new Error(`Supabase upsert failed: ${errText}`);
    }

    const saved = await upsertRes.json();

    return NextResponse.json({
      success: true,
      snapshotDate,
      regime: data.regime,
      score: data.score,
      confidence: data.confidence,
      saved: Array.isArray(saved) ? saved[0] : saved,
    });
  } catch (e) {
    console.error("[daily-regime-snapshot] Error:", e);
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 200 } // 返回 200 避免 Vercel 标记 cron 失败，但记录 error 字段
    );
  }
}
