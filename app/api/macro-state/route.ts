import { NextResponse } from "next/server";
import { fetchMacroWithFallback } from "@/lib/api/fallback-utils";
import { 
  getDimensionConfig, 
  getIndicatorConfig, 
  getMainIndicator, 
  getAuxIndicators, 
  type DimensionConfig 
} from "@/lib/config";

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

// Map config indicator IDs to fetchMacroWithFallback keys
// config uses: us_ism_services_pmi, us_core_pce_yoy, etc.
// fetchMacroWithFallback uses: macro_us, ism_services, etc.
function mapIndicatorToFetchParams(indicatorId: string): { table: "macro_us" | "macro_cn"; field: string; region: "US" | "CN" } {
  const mapping: Record<string, { table: "macro_us" | "macro_cn"; field: string; region: "US" | "CN" }> = {
    "us_ism_services_pmi": { table: "macro_us", field: "ism_services", region: "US" },
    "us_ism_manufacturing_pmi": { table: "macro_us", field: "ism_manufacturing", region: "US" },
    "cn_pmi_mfg": { table: "macro_cn", field: "pmi", region: "CN" },
    "cn_pmi_services": { table: "macro_cn", field: "pmi_services", region: "CN" },
    "us_core_pce_yoy": { table: "macro_us", field: "core_pce_yoy", region: "US" },
    "us_cpi_yoy": { table: "macro_us", field: "cpi_yoy", region: "US" },
    "us_core_cpi_yoy": { table: "macro_us", field: "core_cpi_yoy", region: "US" },
    "cn_cpi_yoy": { table: "macro_cn", field: "cpi_yoy", region: "CN" },
    "cn_ppi_yoy": { table: "macro_cn", field: "ppi_yoy", region: "CN" },
    "us_sofr": { table: "macro_us", field: "sofr", region: "US" },
    "us_fed_funds_rate": { table: "macro_us", field: "fed_funds_rate", region: "US" },
    "cn_lpr_1y": { table: "macro_cn", field: "lpr_1y", region: "CN" },
    "cn_mlf_rate": { table: "macro_cn", field: "mlf_rate", region: "CN" },
    "cn_slf_rate": { table: "macro_cn", field: "slf_rate", region: "CN" },
    "us_10y_yield": { table: "macro_us", field: "yield_10y", region: "US" },
    "us_2y_yield": { table: "macro_us", field: "yield_2y", region: "US" },
    "us_m2_yoy": { table: "macro_us", field: "m2_yoy", region: "US" },
    "us_fci": { table: "macro_us", field: "fci", region: "US" },
    "cn_m2_yoy": { table: "macro_cn", field: "m2_yoy", region: "CN" },
    "cn_shibor_overnight": { table: "macro_cn", field: "shibor_overnight", region: "CN" },
  };
  return mapping[indicatorId] || { table: "macro_us", field: indicatorId, region: "US" };
}

async function fetchIndicator(indicatorId: string) {
  const params = mapIndicatorToFetchParams(indicatorId);
  return fetchMacroWithFallback(params.table, params.field, params.region);
}

function buildDimOutput(dim: Dim, config: DimensionConfig, usData: { value: number | null; asOf: string | null; isStale: boolean; source: string }, cnData: { value: number | null; asOf: string | null; isStale: boolean; source: string }, auxData: Record<string, number | null>): DimOutput {
  const thresholdsUs = config.indicators.us.thresholds;
  const thresholdsCn = config.indicators.cn.thresholds;

  const usMainIndicator = config.indicators.us.main;
  const cnMainIndicator = config.indicators.cn.main;

  const usAuxIndicatorIds = config.indicators.us.aux;
  const cnAuxIndicatorIds = config.indicators.cn.aux;

  const usState = stateFromThreshold(usData.value, thresholdsUs, thresholdsUs.higherIsBetter);
  const cnState = stateFromThreshold(cnData.value, thresholdsCn, thresholdsCn.higherIsBetter);

  // Build note with main + aux values
  const usAuxStr = usAuxIndicatorIds.map(id => `${id}=${auxData[id] ?? "—"}`).join(", ");
  const cnAuxStr = cnAuxIndicatorIds.map(id => `${id}=${auxData[id] ?? "—"}`).join(", ");

  const usMainConfig = getIndicatorConfig(usMainIndicator);
  const cnMainConfig = getIndicatorConfig(cnMainIndicator);

  const note = dim === "inflation" 
    ? `${usMainConfig?.name_cn || usMainIndicator}(main) · aux={${usAuxStr}}`
    : dim === "policy"
    ? `${usMainConfig?.name_cn || usMainIndicator}(main) · aux={${usAuxStr}}`
    : `${usMainConfig?.name_cn || usMainIndicator} · aux={${usAuxStr}}`;

  return {
    dim,
    name: config.name,
    us: {
      value: usData.value,
      unit: (usMainConfig?.unit as Unit) || "idx",
      asOf: usData.asOf,
      stale: usData.isStale,
      state: usState,
      trend: "unknown",
      note,
      source: usData.source,
    },
    cn: {
      value: cnData.value,
      unit: (cnMainConfig?.unit as Unit) || "%",
      asOf: cnData.asOf,
      stale: cnData.isStale,
      state: cnState,
      trend: "unknown",
      note: `${cnMainConfig?.name_cn || cnMainIndicator} · aux={${cnAuxStr}}`,
      source: cnData.source,
    },
  };
}

export async function GET() {
  const updatedAt = new Date().toISOString();

  // Get dimension configs
  const growthConfig = getDimensionConfig("growth");
  const inflationConfig = getDimensionConfig("inflation");
  const policyConfig = getDimensionConfig("policy");
  const liquidityConfig = getDimensionConfig("liquidity");

  // Get main indicator IDs from config
  const growthMainUs = getMainIndicator("growth", "us");
  const growthMainCn = getMainIndicator("growth", "cn");
  const inflationMainUs = getMainIndicator("inflation", "us");
  const inflationMainCn = getMainIndicator("inflation", "cn");
  const policyMainUs = getMainIndicator("policy", "us");
  const policyMainCn = getMainIndicator("policy", "cn");
  const liquidityMainUs = getMainIndicator("liquidity", "us");
  const liquidityMainCn = getMainIndicator("liquidity", "cn");

  // Get aux indicator IDs
  const growthAuxUs = getAuxIndicators("growth", "us");
  const growthAuxCn = getAuxIndicators("growth", "cn");
  const inflationAuxUs = getAuxIndicators("inflation", "us");
  const inflationAuxCn = getAuxIndicators("inflation", "cn");
  const policyAuxUs = getAuxIndicators("policy", "us");
  const policyAuxCn = getAuxIndicators("policy", "cn");
  const liquidityAuxUs = getAuxIndicators("liquidity", "us");
  const liquidityAuxCn = getAuxIndicators("liquidity", "cn");

  // Fetch all main indicators
  const [
    usIsmResult, cnPmiResult,
    usCorePceResult, cnCpiResult,
    usSofrResult, cnLprResult,
    us10yResult, cnM2Result,
  ] = await Promise.all([
    // Growth
    fetchIndicator(growthMainUs),
    fetchIndicator(growthMainCn),
    // Inflation
    fetchIndicator(inflationMainUs),
    fetchIndicator(inflationMainCn),
    // Policy
    fetchIndicator(policyMainUs),
    fetchIndicator(policyMainCn),
    // Liquidity
    fetchIndicator(liquidityMainUs),
    fetchIndicator(liquidityMainCn),
  ]);

  // Build aux data map for notes
  const auxData: Record<string, number | null> = {};
  const auxPromises = [
    ...growthAuxUs.map(id => fetchIndicator(id).then(r => { auxData[id] = r.value; })),
    ...growthAuxCn.map(id => fetchIndicator(id).then(r => { auxData[id] = r.value; })),
    ...inflationAuxUs.map(id => fetchIndicator(id).then(r => { auxData[id] = r.value; })),
    ...inflationAuxCn.map(id => fetchIndicator(id).then(r => { auxData[id] = r.value; })),
    ...policyAuxUs.map(id => fetchIndicator(id).then(r => { auxData[id] = r.value; })),
    ...policyAuxCn.map(id => fetchIndicator(id).then(r => { auxData[id] = r.value; })),
    ...liquidityAuxUs.map(id => fetchIndicator(id).then(r => { auxData[id] = r.value; })),
    ...liquidityAuxCn.map(id => fetchIndicator(id).then(r => { auxData[id] = r.value; })),
  ];
  await Promise.all(auxPromises);

  // Build dimensions
  const growth = buildDimOutput("growth", growthConfig, 
    { value: usIsmResult.value, asOf: usIsmResult.asOf, isStale: usIsmResult.isStale, source: usIsmResult.source },
    { value: cnPmiResult.value, asOf: cnPmiResult.asOf, isStale: cnPmiResult.isStale, source: cnPmiResult.source },
    auxData
  );

  const inflation = buildDimOutput("inflation", inflationConfig,
    { value: usCorePceResult.value, asOf: usCorePceResult.asOf, isStale: usCorePceResult.isStale, source: usCorePceResult.source },
    { value: cnCpiResult.value, asOf: cnCpiResult.asOf, isStale: cnCpiResult.isStale, source: cnCpiResult.source },
    auxData
  );

  const policy = buildDimOutput("policy", policyConfig,
    { value: usSofrResult.value, asOf: usSofrResult.asOf, isStale: usSofrResult.isStale, source: usSofrResult.source },
    { value: cnLprResult.value, asOf: cnLprResult.asOf, isStale: cnLprResult.isStale, source: cnLprResult.source },
    auxData
  );

  const liquidity = buildDimOutput("liquidity", liquidityConfig,
    { value: us10yResult.value, asOf: us10yResult.asOf, isStale: us10yResult.isStale, source: us10yResult.source },
    { value: cnM2Result.value, asOf: cnM2Result.asOf, isStale: cnM2Result.isStale, source: cnM2Result.source },
    auxData
  );

  const dims = [growth, inflation, policy, liquidity];

  // Regime score
  const score =
    0.35 * (scoreFromState(growth.us.state) + scoreFromState(growth.cn.state)) +
    0.35 * (scoreFromState(liquidity.us.state) + scoreFromState(liquidity.cn.state)) +
    0.20 * (scoreFromState(inflation.us.state) + scoreFromState(inflation.cn.state)) +
    0.10 * (scoreFromState(policy.us.state) + scoreFromState(policy.cn.state));

  const normScore = score / 2;
  const regime: Regime = normScore > 0.3 ? "Risk-ON" : normScore < -0.3 ? "Risk-OFF" : "Neutral";

  const usStale = usIsmResult.isStale;
  const cnStale = cnPmiResult.isStale;
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
      configSource: "config/macro_framework_v1.json",
      fallbackChain: "Supabase(last-non-null, 12mo) -> FRED/AkShare",
    },
  };

  return NextResponse.json(res, { status: 200, headers: { "Cache-Control": "no-store" } });
}
