import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Unit = "%" | "idx" | "level";

type Dim = "growth" | "inflation" | "policy" | "liquidity";

type Trend = "improving" | "deteriorating" | "stable" | "unknown";

type State = "strong" | "weak" | "neutral" | "unknown";

type DimOutput = {
  dim: Dim;
  name: string;
  us: { value: number | null; unit: Unit; asOf: string | null; state: State; trend: Trend; note: string; stale: boolean };
  cn: { value: number | null; unit: Unit; asOf: string | null; state: State; trend: Trend; note: string; stale: boolean };
};

type Regime = "Risk-ON" | "Neutral" | "Risk-OFF";

type MacroStateResponse = {
  success: boolean;
  updatedAt: string;
  regime: { name: Regime; confidence: number; driver: string; score: number };
  dimensions: DimOutput[];
  debug?: Record<string, unknown>;
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function monthKey(isoDate: string) {
  return isoDate.slice(0, 7);
}

function monthsDiff(cur: string, asOf: string) {
  const [cy, cm] = cur.split("-").map(Number);
  const [ay, am] = asOf.split("-").map(Number);
  return (cy - ay) * 12 + (cm - am);
}

function isMacroMonthlyStale(asOfDate: string | null) {
  if (!asOfDate) return true;
  const now = new Date();
  const cur = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const as = monthKey(asOfDate);
  // allow 1-month lag
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

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function trendFromDelta(delta: number | null): Trend {
  if (delta === null) return "unknown";
  if (Math.abs(delta) < 1e-9) return "stable";
  return delta > 0 ? "improving" : "deteriorating";
}

function stateFromThreshold(value: number | null, thresholds: { strong: number; weak: number }, higherIsBetter = true): State {
  if (value === null) return "unknown";
  if (higherIsBetter) {
    if (value >= thresholds.strong) return "strong";
    if (value <= thresholds.weak) return "weak";
    return "neutral";
  }
  // lower is better
  if (value <= thresholds.strong) return "strong";
  if (value >= thresholds.weak) return "weak";
  return "neutral";
}

function scoreFromState(state: State): number {
  if (state === "strong") return 1;
  if (state === "weak") return -1;
  if (state === "neutral") return 0;
  return 0;
}

function confidenceBase(usStale: boolean, cnStale: boolean, missingCount: number) {
  let c = 80;
  if (usStale) c -= 10;
  if (cnStale) c -= 10;
  c -= missingCount * 8;
  return clamp(c, 20, 90);
}

export async function GET() {
  const updatedAt = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const res: MacroStateResponse = {
      success: false,
      updatedAt,
      regime: { name: "Neutral", confidence: 20, driver: "Supabase not configured", score: 0 },
      dimensions: [],
    };
    return NextResponse.json(res, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

  // pull last 2 months to infer direction
  const usRes = await supabase.from("macro_us").select("*").order("date", { ascending: false }).limit(2);
  const cnRes = await supabase.from("macro_cn").select("*").order("date", { ascending: false }).limit(2);

  const us0 = usRes.data?.[0] as Record<string, unknown> | undefined;
  const us1 = usRes.data?.[1] as Record<string, unknown> | undefined;
  const cn0 = cnRes.data?.[0] as Record<string, unknown> | undefined;
  const cn1 = cnRes.data?.[1] as Record<string, unknown> | undefined;

  const usAsOf = us0?.date ? String(us0.date).slice(0, 10) : null;
  const cnAsOf = cn0?.date ? String(cn0.date).slice(0, 10) : null;
  const usStale = isMacroMonthlyStale(usAsOf);
  const cnStale = isMacroMonthlyStale(cnAsOf);

  // --- Growth ---
  const usIsm = toNum(us0?.ism_manufacturing);
  const usIsmPrev = toNum(us1?.ism_manufacturing);
  const cnPmi = toNum(cn0?.pmi);
  const cnPmiPrev = toNum(cn1?.pmi);

  const growthUsState = stateFromThreshold(usIsm, { strong: 52, weak: 48 }, true);
  const growthCnState = stateFromThreshold(cnPmi, { strong: 50.5, weak: 49 }, true);

  const growth: DimOutput = {
    dim: "growth",
    name: "增长",
    us: {
      value: usIsm,
      unit: "idx",
      asOf: usAsOf,
      stale: usStale,
      state: growthUsState,
      trend: trendFromDelta(usIsm !== null && usIsmPrev !== null ? usIsm - usIsmPrev : null),
      note: "US ISM PMI (>=52 强, <=48 弱)",
    },
    cn: {
      value: cnPmi,
      unit: "idx",
      asOf: cnAsOf,
      stale: cnStale,
      state: growthCnState,
      trend: trendFromDelta(cnPmi !== null && cnPmiPrev !== null ? cnPmi - cnPmiPrev : null),
      note: "CN PMI (>=50.5 强, <=49 弱)",
    },
  };

  // --- Inflation ---
  const usCpi = toNum(us0?.cpi_yoy);
  const usCore = toNum(us0?.core_cpi_yoy);
  const cnCpi = toNum(cn0?.cpi_yoy);

  const infUsState = stateFromThreshold(usCpi, { strong: 2.5, weak: 4.0 }, false); // lower inflation better
  const infCnState = stateFromThreshold(cnCpi, { strong: 2.5, weak: 0.0 }, true); // very low/deflation is weak

  const inflation: DimOutput = {
    dim: "inflation",
    name: "通胀",
    us: {
      value: usCpi,
      unit: "%",
      asOf: usAsOf,
      stale: usStale,
      state: infUsState,
      trend: "unknown",
      note: `US CPI YoY (参考 Core=${usCore ?? "—"})`,
    },
    cn: {
      value: cnCpi,
      unit: "%",
      asOf: cnAsOf,
      stale: cnStale,
      state: infCnState,
      trend: "unknown",
      note: "CN CPI YoY (低通胀/通缩风险)" ,
    },
  };

  // --- Policy ---
  const usPolicy = toNum(us0?.fed_funds_rate);
  const cnLpr = toNum(cn0?.lpr_1y);

  // For policy, we interpret tightness: lower is easier.
  const polUsState = stateFromThreshold(usPolicy, { strong: 3.0, weak: 5.0 }, false);
  const polCnState = stateFromThreshold(cnLpr, { strong: 3.0, weak: 4.0 }, false);

  const policy: DimOutput = {
    dim: "policy",
    name: "政策",
    us: {
      value: usPolicy,
      unit: "%",
      asOf: usAsOf,
      stale: usStale,
      state: polUsState,
      trend: "unknown",
      note: "US Policy Rate (越低越宽松)",
    },
    cn: {
      value: cnLpr,
      unit: "%",
      asOf: cnAsOf,
      stale: cnStale,
      state: polCnState,
      trend: "unknown",
      note: "CN LPR 1Y (越低越宽松)",
    },
  };

  // --- Liquidity ---
  const us10y = toNum(us0?.yield_10y);
  const us2y = toNum(us0?.yield_2y);
  const cnM2 = toNum(cn0?.m2_yoy);

  // liquidity proxy: lower yields / higher M2 growth = better liquidity
  const liqUsState = stateFromThreshold(us10y, { strong: 4.0, weak: 4.7 }, false);
  const liqCnState = stateFromThreshold(cnM2, { strong: 9.5, weak: 7.5 }, true);

  const liquidity: DimOutput = {
    dim: "liquidity",
    name: "流动性",
    us: {
      value: us10y,
      unit: "%",
      asOf: usAsOf,
      stale: usStale,
      state: liqUsState,
      trend: "unknown",
      note: `US 10Y (参考2Y=${us2y ?? "—"})`,
    },
    cn: {
      value: cnM2,
      unit: "%",
      asOf: cnAsOf,
      stale: cnStale,
      state: liqCnState,
      trend: "unknown",
      note: "CN M2 YoY (越高越宽松)",
    },
  };

  const dims = [growth, inflation, policy, liquidity];

  // Regime score: weight growth/liquidity higher.
  const score =
    0.35 * (scoreFromState(growth.us.state) + scoreFromState(growth.cn.state)) +
    0.35 * (scoreFromState(liquidity.us.state) + scoreFromState(liquidity.cn.state)) +
    0.20 * (scoreFromState(inflation.us.state) + scoreFromState(inflation.cn.state)) +
    0.10 * (scoreFromState(policy.us.state) + scoreFromState(policy.cn.state));

  const normScore = score / 2; // roughly -1..+1
  const regime: Regime = normScore > 0.3 ? "Risk-ON" : normScore < -0.3 ? "Risk-OFF" : "Neutral";

  const missingCount = dims.reduce((acc, d) => acc + (d.us.value === null ? 1 : 0) + (d.cn.value === null ? 1 : 0), 0);
  const confidence = confidenceBase(usStale, cnStale, missingCount);

  const driverParts: string[] = [];
  driverParts.push(`增长(US:${growth.us.value ?? "—"},CN:${growth.cn.value ?? "—"})`);
  driverParts.push(`流动性(US10Y:${liquidity.us.value ?? "—"}%,CNM2:${liquidity.cn.value ?? "—"}%)`);
  if (missingCount > 0) driverParts.push(`缺数:${missingCount}`);
  if (usStale || cnStale) driverParts.push(`STALE:${[usStale && "US", cnStale && "CN"].filter(Boolean).join(",")}`);

  const res: MacroStateResponse = {
    success: true,
    updatedAt,
    regime: {
      name: regime,
      confidence,
      driver: driverParts.join(" · "),
      score: Number(normScore.toFixed(3)),
    },
    dimensions: dims,
    debug: {
      usError: usRes.error?.message,
      cnError: cnRes.error?.message,
      usAsOf,
      cnAsOf,
    },
  };

  return NextResponse.json(res, { status: 200, headers: { "Cache-Control": "no-store" } });
}
