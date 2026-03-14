import { NextResponse } from "next/server";
import { fetchMacroWithFallback } from "@/lib/api/fallback-utils";
import { macroFramework, type MacroFrameworkConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type MacroIndicatorStatus = "LIVE" | "STALE" | "OFF";
type QualityTag = "Truth" | "Indicative";

type Indicator = {
  id: string;
  name: string;
  value: number | null;
  unit: "%" | "idx" | "level";
  status: MacroIndicatorStatus;
  asOf: string | null;
  updatedAt: string;
  source: string;
  quality_tag: QualityTag;
  is_stale: boolean;
};

function makeIndicator(
  id: string,
  name: string,
  unit: Indicator["unit"],
  value: number | null,
  asOf: string | null,
  updatedAt: string,
  source: string,
  isStale: boolean,
  qualityTag: QualityTag
): Indicator {
  const status: MacroIndicatorStatus = value === null ? "OFF" : isStale ? "STALE" : "LIVE";
  return {
    id,
    name,
    unit,
    value,
    asOf,
    updatedAt,
    source,
    quality_tag: qualityTag,
    is_stale: isStale,
    status,
  };
}

// Map config indicator IDs to fetchMacroWithFallback keys
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
    "cn_m2_yoy": { table: "macro_cn", field: "m2_yoy", region: "CN" },
    "cn_shibor_overnight": { table: "macro_cn", field: "shibor_overnight", region: "CN" },
  };
  return mapping[indicatorId] || { table: "macro_us", field: indicatorId, region: "US" };
}

async function fetchIndicator(indicatorId: string) {
  const params = mapIndicatorToFetchParams(indicatorId);
  return fetchMacroWithFallback(params.table, params.field, params.region);
}

export async function GET() {
  const updatedAt = new Date().toISOString();
  const config = macroFramework as MacroFrameworkConfig;

  // Get all indicator IDs from config
  const indicatorIds = Object.keys(config.indicators);

  // Fetch all indicators in parallel
  const results = await Promise.all(
    indicatorIds.map(id => fetchIndicator(id))
  );

  // Build indicators array
  const indicators: Indicator[] = indicatorIds.map((id, index) => {
    const indicatorConfig = config.indicators[id];
    const result = results[index];

    return makeIndicator(
      id,
      indicatorConfig.name_cn || indicatorConfig.name,
      indicatorConfig.unit as Indicator["unit"],
      result.value,
      result.asOf,
      updatedAt,
      result.source,
      result.isStale,
      result.qualityTag
    );
  });

  // Organize by dimension for reference
  const byDimension: Record<string, Indicator[]> = {
    growth: [],
    inflation: [],
    policy: [],
    liquidity: [],
  };

  for (const dim of ["growth", "inflation", "policy", "liquidity"] as const) {
    const dimConfig = config.dimensions[dim];
    const mainUs = dimConfig.indicators.us.main;
    const mainCn = dimConfig.indicators.cn.main;
    const auxUs = dimConfig.indicators.us.aux;
    const auxCn = dimConfig.indicators.cn.aux;

    // Add US main
    const usMainInd = indicators.find(i => i.id === mainUs);
    if (usMainInd) byDimension[dim].push(usMainInd);

    // Add CN main
    const cnMainInd = indicators.find(i => i.id === mainCn);
    if (cnMainInd) byDimension[dim].push(cnMainInd);

    // Add aux indicators
    for (const auxId of [...auxUs, ...auxCn]) {
      const auxInd = indicators.find(i => i.id === auxId);
      if (auxInd && !byDimension[dim].find(i => i.id === auxId)) {
        byDimension[dim].push(auxInd);
      }
    }
  }

  return NextResponse.json(
    {
      updatedAt,
      indicators,
      byDimension,
      configSource: "config/macro_framework_v1.json",
      debug: {
        fallbackChain: "Supabase(last-non-null, 12mo window) -> FRED/AkShare",
        totalIndicators: indicators.length,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
