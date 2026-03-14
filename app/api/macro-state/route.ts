import { NextResponse } from "next/server";
import { 
  getDimensionConfig, 
  getIndicatorConfig, 
  getMainIndicator, 
  getAuxIndicators, 
  type DimensionConfig 
} from "@/lib/config";
import { fetchIndicator } from "@/lib/api/indicator-fetch-map";

export const dynamic = "force-dynamic";

type Unit = "%" | "idx" | "level";
type Dim = "growth" | "inflation" | "policy" | "liquidity";
type Trend = "improving" | "deteriorating" | "stable" | "unknown";
type State = "strong" | "weak" | "neutral" | "unknown";

type DimSide = {
  // Existing fields
  value: number | null;
  unit: Unit;
  asOf: string | null;
  state: State;
  trend: Trend;
  note: string;
  stale: boolean;
  source: string;
  // Phase 2 new fields
  summary: string;
  evidence: string[];
  confidence: number;
  trendLabel: string;
};

type DimOutput = {
  dim: Dim;
  name: string;
  us: DimSide;
  cn: DimSide;
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

// Phase 2: Generate summary based on dimension, region, state and value
function generateSummary(dim: Dim, region: "us" | "cn", state: State, value: number | null): string {
  if (value === null) return "数据暂缺，无法判断";
  
  const formattedValue = typeof value === "number" ? value.toFixed(1) : "—";
  
  if (dim === "growth") {
    if (region === "us") {
      if (state === "strong") return `美国经济扩张（ISM服务业PMI ${formattedValue}，高于荣枯线52）`;
      if (state === "neutral") return `美国经济温和（ISM服务业PMI ${formattedValue}，接近荣枯线）`;
      if (state === "weak") return `美国经济收缩压力（ISM服务业PMI ${formattedValue}，低于荣枯线48）`;
    } else {
      if (state === "strong") return `中国经济扩张（制造业PMI ${formattedValue}，高于荣枯线50.5）`;
      if (state === "neutral") return `中国经济温和（制造业PMI ${formattedValue}）`;
      if (state === "weak") return `中国经济偏弱（制造业PMI ${formattedValue}，低于50）`;
    }
  }
  
  if (dim === "inflation") {
    if (region === "us") {
      if (value <= 2.5) return `美国通胀受控（Core PCE ${formattedValue}%，接近Fed目标2%）`;
      if (value < 4.0) return `美国通胀偏高（Core PCE ${formattedValue}%，高于Fed目标2%）`;
      return `美国通胀严峻（Core PCE ${formattedValue}%，显著超出Fed目标）`;
    } else {
      if (value >= 2.5) return `中国通胀温和回升（CPI同比${formattedValue}%）`;
      if (value > 0) return `中国通胀低迷（CPI同比${formattedValue}%，低于目标3%）`;
      return `中国面临通缩压力（CPI同比${formattedValue}%）`;
    }
  }
  
  if (dim === "policy") {
    if (region === "us") {
      if (value <= 3.0) return `美联储政策宽松（SOFR ${formattedValue}%，处于中性区间以下）`;
      if (value < 5.5) return `美联储政策中性偏紧（SOFR ${formattedValue}%）`;
      return `美联储政策高度限制性（SOFR ${formattedValue}%，处于高位）`;
    } else {
      if (value <= 3.0) return `中国货币政策宽松（LPR 1Y ${formattedValue}%）`;
      if (value < 4.0) return `中国货币政策中性（LPR 1Y ${formattedValue}%）`;
      return `中国货币政策偏紧（LPR 1Y ${formattedValue}%）`;
    }
  }
  
  if (dim === "liquidity") {
    if (region === "us") {
      if (value <= 4.0) return `美债利率温和（10Y ${formattedValue}%），流动性宽裕`;
      if (value < 4.7) return `美债利率中性（10Y ${formattedValue}%），流动性中性`;
      return `美债利率高企（10Y ${formattedValue}%），流动性偏紧`;
    } else {
      if (value >= 9.5) return `中国流动性充裕（M2同比${formattedValue}%）`;
      if (value > 7.5) return `中国流动性中性（M2同比${formattedValue}%）`;
      return `中国流动性偏紧（M2同比${formattedValue}%）`;
    }
  }
  
  return "数据暂缺，无法判断";
}

// Phase 2: Generate evidence array based on dim, region, main value and aux data
function generateEvidence(dim: Dim, region: "us" | "cn", value: number | null, asOf: string | null, auxData: Record<string, number | null>): string[] {
  const evidence: string[] = [];
  const dateStr = asOf ? asOf.split("T")[0] : "未知日期";
  
  if (dim === "growth") {
    if (region === "us") {
      const mainLabel = "ISM服务业PMI";
      const target = "52";
      if (value !== null) {
        const deviation = (value - 52).toFixed(1);
        const sign = value >= 52 ? "+" : "";
        evidence.push(`${mainLabel}: ${value.toFixed(1)}（荣枯线: ${target}，偏差: ${sign}${deviation}）`);
      }
      const mfg = auxData["us_ism_manufacturing_pmi"];
      if (mfg !== null && mfg !== undefined) {
        evidence.push(`ISM制造业PMI: ${mfg.toFixed(1)}（辅助参考）`);
      }
      const unemp = auxData["us_unemployment_rate"];
      if (unemp !== null && unemp !== undefined) {
        evidence.push(`失业率: ${unemp.toFixed(1)}%（辅助参考）`);
      }
    } else {
      const mainLabel = "制造业PMI";
      const target = "50";
      if (value !== null) {
        const deviation = (value - 50).toFixed(1);
        const sign = value >= 50 ? "+" : "";
        evidence.push(`${mainLabel}: ${value.toFixed(1)}（荣枯线: ${target}，偏差: ${sign}${deviation}）`);
      }
      const services = auxData["cn_pmi_services"];
      if (services !== null && services !== undefined) {
        evidence.push(`非制造业PMI: ${services.toFixed(1)}（辅助参考）`);
      }
    }
  }
  
  if (dim === "inflation") {
    if (region === "us") {
      const mainLabel = "Core PCE YoY";
      const target = "2.0%";
      if (value !== null) {
        const deviation = (value - 2.0).toFixed(2);
        const sign = value > 2.0 ? "+" : "";
        evidence.push(`${mainLabel}: ${value.toFixed(2)}%（Fed目标: ${target}，偏差: ${sign}${deviation}%）`);
      }
      const cpi = auxData["us_cpi_yoy"];
      if (cpi !== null && cpi !== undefined) {
        evidence.push(`CPI YoY: ${cpi.toFixed(1)}%（辅助参考）`);
      }
      const coreCpi = auxData["us_core_cpi_yoy"];
      if (coreCpi !== null && coreCpi !== undefined) {
        evidence.push(`Core CPI YoY: ${coreCpi.toFixed(1)}%（辅助参考）`);
      }
    } else {
      const mainLabel = "CPI YoY";
      const target = "3.0%";
      if (value !== null) {
        const deviation = (value - 3.0).toFixed(1);
        const sign = value > 3.0 ? "+" : "";
        evidence.push(`${mainLabel}: ${value.toFixed(1)}%（目标: ${target}，偏差: ${sign}${deviation}%）`);
      }
      const ppi = auxData["cn_ppi_yoy"];
      if (ppi !== null && ppi !== undefined) {
        evidence.push(`PPI YoY: ${ppi.toFixed(1)}%（辅助参考）`);
      }
    }
  }
  
  if (dim === "policy") {
    if (region === "us") {
      const mainLabel = "SOFR";
      if (value !== null) {
        evidence.push(`${mainLabel}: ${value.toFixed(2)}%`);
      }
      const fedFunds = auxData["us_fed_funds_rate"];
      if (fedFunds !== null && fedFunds !== undefined) {
        evidence.push(`联邦基金利率: ${fedFunds.toFixed(2)}%（辅助参考）`);
      }
    } else {
      const mainLabel = "LPR 1Y";
      if (value !== null) {
        evidence.push(`${mainLabel}: ${value.toFixed(2)}%`);
      }
      const mlf = auxData["cn_mlf_rate"];
      if (mlf !== null && mlf !== undefined) {
        evidence.push(`MLF利率: ${mlf.toFixed(2)}%（辅助参考）`);
      }
      const slf = auxData["cn_slf_rate"];
      if (slf !== null && slf !== undefined) {
        evidence.push(`SLF利率: ${slf.toFixed(2)}%（辅助参考）`);
      }
    }
  }
  
  if (dim === "liquidity") {
    if (region === "us") {
      const mainLabel = "10Y Yield";
      if (value !== null) {
        evidence.push(`${mainLabel}: ${value.toFixed(2)}%`);
      }
      const y2 = auxData["us_2y_yield"];
      if (y2 !== null && y2 !== undefined) {
        evidence.push(`2Y Yield: ${y2.toFixed(2)}%（辅助参考）`);
      }
    } else {
      const mainLabel = "M2 YoY";
      if (value !== null) {
        evidence.push(`${mainLabel}: ${value.toFixed(1)}%`);
      }
      const shibor = auxData["cn_shibor_overnight"];
      if (shibor !== null && shibor !== undefined) {
        evidence.push(`隔夜SHIBOR: ${shibor.toFixed(2)}%（辅助参考）`);
      }
    }
  }
  
  evidence.push(`数据日期: ${dateStr}`);
  
  return evidence.slice(0, 3);
}

// Phase 2: Calculate confidence for a dimension side
function calculateDimConfidence(value: number | null, isStale: boolean, auxData: Record<string, number | null>): number {
  let c = 80;
  
  if (isStale) c -= 15;
  if (value === null) c -= 25;
  
  const auxValues = Object.values(auxData).filter(v => v !== null && v !== undefined);
  if (auxValues.length === 0 && value !== null) c -= 10;
  
  return clamp(c, 10, 95);
}

// Phase 2: Calculate trend label based on state, value and thresholds
function calculateTrendLabel(dim: Dim, region: "us" | "cn", state: State, value: number | null, thresholds: { strong: number; weak: number }): string {
  if (value === null) return "? 数据缺失";
  
  const { strong, weak } = thresholds;
  
  if (region === "us") {
    if (dim === "growth" || dim === "liquidity") {
      if (state === "strong" && value >= strong + 2) return "↑ 走强";
      if (state === "weak" && value <= weak - 2) return "↓ 走弱";
      return "→ 横盘";
    } else {
      if (state === "strong" && value <= strong - 0.5) return "↑ 走强";
      if (state === "weak" && value >= weak + 0.5) return "↓ 走弱";
      return "→ 横盘";
    }
  } else {
    if (dim === "growth" || dim === "liquidity") {
      if (state === "strong" && value >= strong) return "↑ 走强";
      if (state === "weak" && value <= weak) return "↓ 走弱";
      return "→ 横盘";
    } else {
      if (dim === "inflation") {
        if (state === "strong" && value >= 2.5) return "↑ 走强";
        if (state === "weak" && value <= 0) return "↓ 走弱";
        return "→ 横盘";
      }
      if (state === "strong" && value <= strong) return "↑ 走强";
      if (state === "weak" && value >= weak) return "↓ 走弱";
      return "→ 横盘";
    }
  }
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

  // Phase 2: Build aux data subset for each side
  const usAuxData: Record<string, number | null> = {};
  const cnAuxData: Record<string, number | null> = {};
  usAuxIndicatorIds.forEach(id => { usAuxData[id] = auxData[id]; });
  cnAuxIndicatorIds.forEach(id => { cnAuxData[id] = auxData[id]; });

  // Phase 2: Generate new fields
  const usSummary = generateSummary(dim, "us", usState, usData.value);
  const cnSummary = generateSummary(dim, "cn", cnState, cnData.value);
  const usEvidence = generateEvidence(dim, "us", usData.value, usData.asOf, usAuxData);
  const cnEvidence = generateEvidence(dim, "cn", cnData.value, cnData.asOf, cnAuxData);
  const usDimConfidence = calculateDimConfidence(usData.value, usData.isStale, usAuxData);
  const cnDimConfidence = calculateDimConfidence(cnData.value, cnData.isStale, cnAuxData);
  const usTrendLabel = calculateTrendLabel(dim, "us", usState, usData.value, thresholdsUs);
  const cnTrendLabel = calculateTrendLabel(dim, "cn", cnState, cnData.value, thresholdsCn);

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
      // Phase 2 new fields
      summary: usSummary,
      evidence: usEvidence,
      confidence: usDimConfidence,
      trendLabel: usTrendLabel,
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
      // Phase 2 new fields
      summary: cnSummary,
      evidence: cnEvidence,
      confidence: cnDimConfidence,
      trendLabel: cnTrendLabel,
    },
  };
}

export async function GET(request: Request) {
  // Check for no_cache query parameter
  const { searchParams } = new URL(request.url);
  const noCache = searchParams.get("no_cache") === "1";

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

  // Determine Cache-Control based on no_cache parameter
  const cacheControl = noCache 
    ? "no-store" 
    : "public, s-maxage=120, stale-while-revalidate=600";

  return NextResponse.json(res, { status: 200, headers: { "Cache-Control": cacheControl } });
}
