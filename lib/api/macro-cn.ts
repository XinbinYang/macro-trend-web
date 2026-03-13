export type CnMacroSnapshot = {
  region: "CN";
  status: "LIVE" | "STALE" | "OFF";
  updatedAt: string;
  asOf: string | null;
  series: {
    gdp_yoy?: { value: number | null; asOf: string | null; source: string };
    cpi_yoy?: { value: number | null; asOf: string | null; source: string; unit?: string };
    ppi_yoy?: { value: number | null; asOf: string | null; source: string; unit?: string };
    pmi_mfg?: { value: number | null; asOf: string | null; source: string };
    m2_yoy?: { value: number | null; asOf: string | null; source: string; unit?: string };
    unemployment_urban?: { value: number | null; asOf: string | null; source: string; unit?: string };
    lpr_1y?: { value: number | null; asOf: string | null; source: string };
    lpr_5y?: { value: number | null; asOf: string | null; source: string };
    social_financing?: { value: number | null; asOf: string | null; source: string; unit?: string };
  };
  notes?: string;
};

export type CnMacroResponse = {
  success: boolean;
  freshness?: "LIVE" | "STALE";
  stale?: boolean;
  data?: CnMacroSnapshot;
};

export async function fetchCnMacroSnapshot(): Promise<CnMacroResponse | null> {
  try {
    const res = await fetch("/api/macro-cn", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as CnMacroResponse;
    if (!json?.success || !json?.data) return null;
    return json;
  } catch {
    return null;
  }
}
