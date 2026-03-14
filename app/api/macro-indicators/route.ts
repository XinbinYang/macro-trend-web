import { NextResponse } from "next/server";
import { fetchMacroWithFallback } from "@/lib/api/fallback-utils";

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

export async function GET() {
  const updatedAt = new Date().toISOString();

  // Use unified fallback chain for each indicator
  const [
    usIsmMfgResult,
    usIsmSvcResult,
    usCorePceResult,
    usCpiResult,
    usCoreCpiResult,
    cnPmiResult,
    cnCpiResult,
    usSofrResult,
    usFedFundsResult,
    cnLprResult,
    us10yResult,
    us2yResult,
    cnM2Result,
    cnUnemploymentResult,
    usUnemploymentResult,
  ] = await Promise.all([
    // Growth
    fetchMacroWithFallback("macro_us", "ism_manufacturing", "US"),
    fetchMacroWithFallback("macro_us", "ism_services", "US"),
    fetchMacroWithFallback("macro_us", "core_pce_yoy", "US"),
    fetchMacroWithFallback("macro_us", "cpi_yoy", "US"),
    fetchMacroWithFallback("macro_us", "core_cpi_yoy", "US"),
    fetchMacroWithFallback("macro_cn", "pmi", "CN"),
    fetchMacroWithFallback("macro_cn", "cpi_yoy", "CN"),
    // Policy
    fetchMacroWithFallback("macro_us", "sofr", "US"),
    fetchMacroWithFallback("macro_us", "fed_funds_rate", "US"),
    fetchMacroWithFallback("macro_cn", "lpr_1y", "CN"),
    // Rates / Liquidity
    fetchMacroWithFallback("macro_us", "yield_10y", "US"),
    fetchMacroWithFallback("macro_us", "yield_2y", "US"),
    fetchMacroWithFallback("macro_cn", "m2_yoy", "CN"),
    fetchMacroWithFallback("macro_cn", "unemployment", "CN"),
    fetchMacroWithFallback("macro_us", "unemployment_rate", "US"),
  ]);

  const indicators: Indicator[] = [
    // Growth
    makeIndicator("us_ism_mfg_pmi", "US ISM Manufacturing PMI", "idx", usIsmMfgResult.value, usIsmMfgResult.asOf, updatedAt, usIsmMfgResult.source, usIsmMfgResult.isStale, usIsmMfgResult.qualityTag),
    makeIndicator("us_ism_services_pmi", "US ISM Services PMI", "idx", usIsmSvcResult.value, usIsmSvcResult.asOf, updatedAt, usIsmSvcResult.source, usIsmSvcResult.isStale, usIsmSvcResult.qualityTag),
    makeIndicator("cn_pmi_mfg", "CN PMI (Mfg)", "idx", cnPmiResult.value, cnPmiResult.asOf, updatedAt, cnPmiResult.source, cnPmiResult.isStale, cnPmiResult.qualityTag),

    // Inflation
    makeIndicator("us_core_pce_yoy", "US Core PCE YoY (main)", "%", usCorePceResult.value, usCorePceResult.asOf, updatedAt, usCorePceResult.source, usCorePceResult.isStale, usCorePceResult.qualityTag),
    makeIndicator("us_cpi_yoy", "US CPI YoY (aux)", "%", usCpiResult.value, usCpiResult.asOf, updatedAt, usCpiResult.source, usCpiResult.isStale, usCpiResult.qualityTag),
    makeIndicator("us_core_cpi_yoy", "US Core CPI YoY", "%", usCoreCpiResult.value, usCoreCpiResult.asOf, updatedAt, usCoreCpiResult.source, usCoreCpiResult.isStale, usCoreCpiResult.qualityTag),
    makeIndicator("cn_cpi_yoy", "CN CPI YoY", "%", cnCpiResult.value, cnCpiResult.asOf, updatedAt, cnCpiResult.source, cnCpiResult.isStale, cnCpiResult.qualityTag),

    // Policy
    makeIndicator("us_sofr", "US SOFR (main)", "%", usSofrResult.value, usSofrResult.asOf, updatedAt, usSofrResult.source, usSofrResult.isStale, usSofrResult.qualityTag),
    makeIndicator("us_fed_funds", "US Fed Funds (aux)", "%", usFedFundsResult.value, usFedFundsResult.asOf, updatedAt, usFedFundsResult.source, usFedFundsResult.isStale, usFedFundsResult.qualityTag),
    makeIndicator("cn_lpr_1y", "CN LPR 1Y", "%", cnLprResult.value, cnLprResult.asOf, updatedAt, cnLprResult.source, cnLprResult.isStale, cnLprResult.qualityTag),

    // Liquidity / Rates
    makeIndicator("us_10y_yield", "US 10Y", "%", us10yResult.value, us10yResult.asOf, updatedAt, us10yResult.source, us10yResult.isStale, us10yResult.qualityTag),
    makeIndicator("us_2y_yield", "US 2Y", "%", us2yResult.value, us2yResult.asOf, updatedAt, us2yResult.source, us2yResult.isStale, us2yResult.qualityTag),
    makeIndicator("cn_m2_yoy", "CN M2 YoY", "%", cnM2Result.value, cnM2Result.asOf, updatedAt, cnM2Result.source, cnM2Result.isStale, cnM2Result.qualityTag),
    makeIndicator("cn_unemployment", "CN Unemployment", "%", cnUnemploymentResult.value, cnUnemploymentResult.asOf, updatedAt, cnUnemploymentResult.source, cnUnemploymentResult.isStale, cnUnemploymentResult.qualityTag),
    makeIndicator("us_unemployment", "US Unemployment", "%", usUnemploymentResult.value, usUnemploymentResult.asOf, updatedAt, usUnemploymentResult.source, usUnemploymentResult.isStale, usUnemploymentResult.qualityTag),
  ];

  return NextResponse.json(
    {
      updatedAt,
      indicators,
      debug: {
        fallbackChain: "Supabase(last-non-null, 12mo window) -> FRED/AkShare",
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
