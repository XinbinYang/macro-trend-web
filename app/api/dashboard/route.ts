/**
 * Aggregated Dashboard API
 * Single entry point for homepage, reducing 5+ parallel requests to 1
 * 
 * Returns:
 * - macroState: 增长×通胀四象限 + 情景概率 + Risk-ON/OFF
 * - policyLiquidity: 政策×流动性验证条
 * - watchlist: 核心24个标的 (from config)
 * - nav: 策略净值
 * - news: 最新资讯 (optional, behind flag)
 */

import { NextResponse } from "next/server";
import { fetchMacroWithFallback } from "@/lib/api/fallback-utils";
import dashboardConfig from "@/config/dashboard.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Types
type Regime = "Risk-ON" | "Neutral" | "Risk-OFF";
type Dim = "growth" | "inflation" | "policy" | "liquidity";
type State = "strong" | "weak" | "neutral" | "unknown";
type Trend = "improving" | "deteriorating" | "stable" | "unknown";
type Unit = "%" | "idx" | "level";

interface DimOutput {
  dim: Dim;
  name: string;
  us: { value: number | null; unit: Unit; asOf: string | null; state: State; trend: Trend; note: string; stale: boolean; source: string };
  cn: { value: number | null; unit: Unit; asOf: string | null; state: State; trend: Trend; note: string; stale: boolean; source: string };
}

interface MacroState {
  updatedAt: string;
  regime: { name: Regime; confidence: number; driver: string; score: number };
  dimensions: DimOutput[];
}

interface NavPoint {
  date: string;
  value: number;
}


interface DashboardConfig {
  watchlist: {
    us: Array<{ symbol: string; name: string; category: string }>;
    cn: Array<{ symbol: string; name: string; category: string }>;
    hk: Array<{ symbol: string; name: string; category: string }>;
    global: Array<{ symbol: string; name: string; category: string }>;
  };
  macroDimensions: Record<string, { name: string; emoji: string }>;
}

// Config cast
const config = dashboardConfig as DashboardConfig;

// Helpers
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

// Fetch macro dimensions (same logic as /api/macro-state)
async function fetchMacroState(): Promise<MacroState> {
  const updatedAt = new Date().toISOString();

  const [
    usIsmSvcResult,
    cnPmiResult,
    usCorePceResult,
    usCpiResult,
    cnCpiResult,
    usSofrResult,
    usFedFundsResult,
    cnLprResult,
    us10yResult,
    us2yResult,
    cnM2Result,
  ] = await Promise.all([
    fetchMacroWithFallback("macro_us", "ism_services", "US"),
    fetchMacroWithFallback("macro_cn", "pmi", "CN"),
    fetchMacroWithFallback("macro_us", "core_pce_yoy", "US"),
    fetchMacroWithFallback("macro_us", "cpi_yoy", "US"),
    fetchMacroWithFallback("macro_cn", "cpi_yoy", "CN"),
    fetchMacroWithFallback("macro_us", "sofr", "US"),
    fetchMacroWithFallback("macro_us", "fed_funds_rate", "US"),
    fetchMacroWithFallback("macro_cn", "lpr_1y", "CN"),
    fetchMacroWithFallback("macro_us", "yield_10y", "US"),
    fetchMacroWithFallback("macro_us", "yield_2y", "US"),
    fetchMacroWithFallback("macro_cn", "m2_yoy", "CN"),
  ]);

  const usIsm = usIsmSvcResult.value;
  const cnPmi = cnPmiResult.value;
  const usCorePce = usCorePceResult.value;
  const usCpi = usCpiResult.value;
  const cnCpi = cnCpiResult.value;
  const usSofr = usSofrResult.value;
  const usFedFunds = usFedFundsResult.value;
  const cnLpr = cnLprResult.value;
  const us10y = us10yResult.value;
  const us2y = us2yResult.value;
  const cnM2 = cnM2Result.value;

  const usAsOf = usIsmSvcResult.asOf;
  const usInfAsOf = usCorePceResult.asOf;
  const cnAsOf = cnPmiResult.asOf;
  const usStale = usIsmSvcResult.isStale;
  const cnStale = cnPmiResult.isStale;

  // Growth
  const growthUsState = stateFromThreshold(usIsm, { strong: 52, weak: 48 }, true);
  const growthCnState = stateFromThreshold(cnPmi, { strong: 50.5, weak: 49 }, true);

  const growth: DimOutput = {
    dim: "growth",
    name: "增长",
    us: { value: usIsm, unit: "idx", asOf: usAsOf, stale: usStale, state: growthUsState, trend: "unknown", note: "US ISM Services PMI", source: usIsmSvcResult.source },
    cn: { value: cnPmi, unit: "idx", asOf: cnAsOf, stale: cnStale, state: growthCnState, trend: "unknown", note: "CN PMI", source: cnPmiResult.source },
  };

  // Inflation (US main=Core PCE YoY; CPI as auxiliary)
  const infUsState = stateFromThreshold(usCorePce, { strong: 2.5, weak: 4.0 }, false);
  const infCnState = stateFromThreshold(cnCpi, { strong: 2.5, weak: 0.0 }, true);

  const inflation: DimOutput = {
    dim: "inflation",
    name: "通胀",
    us: { value: usCorePce, unit: "%", asOf: usInfAsOf || usAsOf, stale: usCorePceResult.isStale, state: infUsState, trend: "unknown", note: `US Core PCE YoY (main) · CPI YoY(aux)=${usCpi ?? "—"}`, source: usCorePceResult.source },
    cn: { value: cnCpi, unit: "%", asOf: cnAsOf, stale: cnStale, state: infCnState, trend: "unknown", note: "CN CPI YoY", source: cnCpiResult.source },
  };

  // Policy
  const polUsState = stateFromThreshold(usSofr, { strong: 3.0, weak: 5.0 }, false);
  const polCnState = stateFromThreshold(cnLpr, { strong: 3.0, weak: 4.0 }, false);

  const policy: DimOutput = {
    dim: "policy",
    name: "政策",
    us: { value: usSofr, unit: "%", asOf: usAsOf, stale: usStale, state: polUsState, trend: "unknown", note: `US SOFR (main) · Fed Funds(aux)=${usFedFunds ?? "—"}`, source: usSofrResult.source },
    cn: { value: cnLpr, unit: "%", asOf: cnAsOf, stale: cnStale, state: polCnState, trend: "unknown", note: "CN LPR 1Y", source: cnLprResult.source },
  };

  // Liquidity
  const liqUsState = stateFromThreshold(us10y, { strong: 4.0, weak: 4.7 }, false);
  const liqCnState = stateFromThreshold(cnM2, { strong: 9.5, weak: 7.5 }, true);

  const liquidity: DimOutput = {
    dim: "liquidity",
    name: "流动性",
    us: { value: us10y, unit: "%", asOf: usAsOf, stale: usStale, state: liqUsState, trend: "unknown", note: `US 10Y (2Y=${us2y ?? "—"})`, source: us10yResult.source },
    cn: { value: cnM2, unit: "%", asOf: cnAsOf, stale: cnStale, state: liqCnState, trend: "unknown", note: "CN M2 YoY", source: cnM2Result.source },
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

  return {
    updatedAt,
    regime: {
      name: regime,
      confidence,
      driver: driverParts.join(" · "),
      score: Number(normScore.toFixed(3)),
    },
    dimensions: dims,
  };
}

// Fetch NAV (simplified)
async function fetchNav() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/nav?strategy=beta70`, { 
      cache: 'no-store' 
    });
    const json = await res.json();
    
    if (json.success && json.data?.nav) {
      return {
        status: json.data.status === "SAMPLE" ? "SAMPLE" : "LIVE",
        asOf: json.data.asOf || "",
        nav: json.data.nav.map((item: { date: string; value: number }) => ({
          date: item.date,
          value: item.value,
        })),
        metrics: json.data.metrics || null,
      };
    }
    return { status: "OFFLINE", asOf: "", nav: [] as NavPoint[], metrics: null };
  } catch (error) {
    console.error("[Dashboard] NAV fetch error:", error);
    return { status: "OFFLINE", asOf: "", nav: [] as NavPoint[], metrics: null };
  }
}

// Main GET handler
export async function GET() {
  const startTime = Date.now();

  // Parallel fetch: macroState + nav (news optional)
  const [macroState, nav] = await Promise.all([
    fetchMacroState(),
    fetchNav(),
  ]);

  const latency = Date.now() - startTime;

  const response = {
    success: true,
    latency,
    timestamp: new Date().toISOString(),
    macroState,
    nav,
    watchlist: config.watchlist,
    macroDimensions: config.macroDimensions,
    // Policy×Liquidity verification (derived from macroState)
    policyLiquidity: {
      us: {
        policy: macroState.dimensions.find(d => d.dim === "policy")?.us || null,
        liquidity: macroState.dimensions.find(d => d.dim === "liquidity")?.us || null,
      },
      cn: {
        policy: macroState.dimensions.find(d => d.dim === "policy")?.cn || null,
        liquidity: macroState.dimensions.find(d => d.dim === "liquidity")?.cn || null,
      },
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Dashboard-Latency": String(latency),
    },
  });
}
