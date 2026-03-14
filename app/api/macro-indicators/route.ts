import { NextResponse } from "next/server";
import { macroFramework, type MacroFrameworkConfig } from "@/lib/config";
import { fetchIndicator } from "@/lib/api/indicator-fetch-map";

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

export async function GET(request: Request) {
  // Check for no_cache query parameter
  const { searchParams } = new URL(request.url);
  const noCache = searchParams.get("no_cache") === "1";
  
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

  // Determine Cache-Control based on no_cache parameter
  const cacheControl = noCache 
    ? "no-store" 
    : "public, s-maxage=120, stale-while-revalidate=600";

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
        "Cache-Control": cacheControl,
      },
    }
  );
}
