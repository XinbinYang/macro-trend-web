/**
 * Shared indicator mapping utilities
 * Extracts the common mapIndicatorToFetchParams function used across multiple API routes
 */

import { fetchMacroWithFallback } from "./fallback-utils";

export type TableName = "macro_us" | "macro_cn";
export type RegionName = "US" | "CN";

export interface FetchParams {
  table: TableName;
  field: string;
  region: RegionName;
}

// Map config indicator IDs to fetchMacroWithFallback keys
// config uses: us_ism_services_pmi, us_core_pce_yoy, etc.
// fetchMacroWithFallback uses: macro_us, ism_services, etc.
export function mapIndicatorToFetchParams(indicatorId: string): FetchParams {
  const mapping: Record<string, FetchParams> = {
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
    "us_unemployment_rate": { table: "macro_us", field: "unemployment_rate", region: "US" },
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

export async function fetchIndicator(indicatorId: string) {
  const params = mapIndicatorToFetchParams(indicatorId);
  return fetchMacroWithFallback(params.table, params.field, params.region);
}
