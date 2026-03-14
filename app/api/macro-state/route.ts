import { NextResponse } from "next/server";
import { fetchMacroWithFallback } from "@/lib/api/fallback-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Unit = "%" | "idx" | "level";
type Dim = "growth" | "inflation" | "policy" | "liquidity";
type Trend = "improving" | "deteriorating" | "stable" | "unknown";
type State = "strong" | "weak" | "neutral" | "unknown";

type DimOutput = {
  dim: Dim;
  name: string;
  us: { value: number | null; unit: Unit; asOf: string | null; state: State; trend: Trend; note: string; stale: boolean; source: string };
  cn: { value: number | null; unit: Unit; asOf: string | null; state: State; trend: Trend; note: string; stale: boolean; source: string };
};

type Regime = "Risk-ON" | "Neutral" | "Risk-OFF";

type MacroStateResponse = {
  success: boolean;
  updatedAt: string;
  regime: { name: Regime; confidence: number; driver: string; score: number };
  dimensions: DimOutput[];
  debug?: Record<string, unknown>;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
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

  // Fetch all required macro indicators using fallback chain
  const [
    usIsmSvcResult,
    cnPmiResult,
    usCpiResult,
    cnCpiResult,
    usPolicyResult,
    cnLprResult,
    us10yResult,
    us2yResult,
    cnM2Result,
  ] = await Promise.all([
    fetchMacroWithFallback("macro_us", "ism_services", "US"),
    fetchMacroWithFallback("macro_cn", "pmi", "CN"),
    fetchMacroWithFallback("macro_us", "cpi_yoy", "US"),
    fetchMacroWithFallback("macro_cn", "cpi_yoy", "CN"),
    fetchMacroWithFallback("macro_us", "fed_funds_rate", "US"),
    fetchMacroWithFallback("macro_cn", "lpr_1y", "CN"),
    fetchMacroWithFallback("macro_us", "yield_10y", "US"),
    fetchMacroWithFallback("macro_us", "yield_2y", "US"),
    fetchMacroWithFallback("macro_cn", "m2_yoy", "CN"),
  ]);

  const usIsm = usIsmSvcResult.value;
  const cnPmi = cnPmiResult.value;
  const usCpi = usCpiResult.value;
  const cnCpi = cnCpiResult.value;
  const usPolicy = usPolicyResult.value;
  const cnLpr = cnLprResult.value;
  const us10y = us10yResult.value;
  const us2y = us2yResult.value;
  const cnM2 = cnM2Result.value;

  const usAsOf = usIsmSvcResult.asOf;
  const cnAsOf = cnPmiResult.asOf;
  const usStale = usIsmSvcResult.isStale;
  const cnStale = cnPmiResult.isStale;

  // --- Growth ---
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
      trend: "unknown",
      note: "US ISM Services PMI (>=52 强, <=48 弱)",
      source: usIsmSvcResult.source,
    },
    cn: {
      value: cnPmi,
      unit: "idx",
      asOf: cnAsOf,
      stale: cnStale,
      state: growthCnState,
      trend: "unknown",
      note: "CN PMI (>=50.5 强, <=49 弱)",
      source: cnPmiResult.source,
    },
  };

  // --- Inflation ---
  const infUsState = stateFromThreshold(usCpi, { strong: 2.5, weak: 4.0 }, false);
  const infCnState = stateFromThreshold(cnCpi, { strong: 2.5, weak: 0.0 }, true);

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
      note: "US CPI YoY",
      source: usCpiResult.source,
    },
    cn: {
      value: cnCpi,
      unit: "%",
      asOf: cnAsOf,
      stale: cnStale,
      state: infCnState,
      trend: "unknown",
      note: "CN CPI YoY (低通胀/通缩风险)",
      source: cnCpiResult.source,
    },
  };

  // --- Policy ---
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
      source: usPolicyResult.source,
    },
    cn: {
      value: cnLpr,
      unit: "%",
      asOf: cnAsOf,
      stale: cnStale,
      state: polCnState,
      trend: "unknown",
      note: "CN LPR 1Y (越低越宽松)",
      source: cnLprResult.source,
    },
  };

  // --- Liquidity ---
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
      source: us10yResult.source,
    },
    cn: {
      value: cnM2,
      unit: "%",
      asOf: cnAsOf,
      stale: cnStale,
      state: liqCnState,
      trend: "unknown",
      note: "CN M2 YoY (越高越宽松)",
      source: cnM2Result.source,
    },
  };

  const dims = [growth, inflation, policy, liquidity];

  // Regime score
  const score =
    0.35 * (scoreFromState(growth.us.state) + scoreFromState(growth.cn.state)) +
    0.35 * (scoreFromState(liquidity.us.state) + scoreFromState(liquidity.cn.state)) +
    0.20 * (scoreFromState(inflation.us.state) + scoreFromState(inflation.cn.state)) +
    0.10 * (scoreFromState(policy.us.state) + scoreFromState(policy.cn.state));

  const normScore = score / 2;
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
      fallbackChain: "Supabase(last-non-null, 12mo) -> FRED/AkShare",
    },
  };

  return NextResponse.json(res, { status: 200, headers: { "Cache-Control": "no-store" } });
}
