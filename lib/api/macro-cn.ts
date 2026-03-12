export type CnMacroSnapshot = {
  region: "CN";
  status: "LIVE" | "OFF";
  updatedAt: string;
  asOf: string | null;
  series: {
    pmi_mfg?: { value: number | null; asOf: string | null; source: string };
    cpi_yoy?: { value: number | null; asOf: string | null; source: string };
    social_financing?: { value: number | null; asOf: string | null; source: string; unit?: string };
    lpr_1y?: { value: number | null; asOf: string | null; source: string };
    unemployment_urban?: { value: number | null; asOf: string | null; source: string };
    m2_yoy?: { value: number | null; asOf: string | null; source: string };
  };
  notes?: string;
};

export async function fetchCnMacroSnapshot(): Promise<CnMacroSnapshot | null> {
  try {
    const res = await fetch("/api/macro-cn", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!json?.success || !json?.data) return null;
    return json.data as CnMacroSnapshot;
  } catch {
    return null;
  }
}
