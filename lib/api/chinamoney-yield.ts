/**
 * ChinaMoney yield curve helpers (server-only)
 * Endpoint: https://www.chinamoney.com.cn/ags/ms/cm-u-bk-currency/ClsYldCurvHis
 *
 * We use this to compute:
 * - CN2Y/CN5Y/CN10Y (Treasury yield curve points)
 * - CN credit spread proxy: AAA short-term note 5Y - Treasury 5Y
 */

export type ChinaMoneyBondType = "CYCC000" | "CYCC82B"; // Treasury, CP&MTN(AAA)

export type ChinaMoneyTermId = "0.1" | "0.5" | "1";

export interface ChinaMoneyRecord {
  newDateValueCN: string;      // YYYY-MM-DD
  yearTermStr: string;         // e.g. "0.083" (1M)
  maturityYieldStr: string;    // e.g. "1.2300"
  currentYieldStr?: string;
  futureYieldStr?: string;
}

export interface ChinaMoneyResponse {
  head?: unknown;
  data?: { total?: number };
  records?: ChinaMoneyRecord[];
}

function toNum(s: unknown): number | null {
  const v = Number(String(s ?? "").trim());
  return Number.isFinite(v) ? v : null;
}

function headers() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: "https://www.chinamoney.com.cn/chinese/bkcurvclosedyhis/",
    Origin: "https://www.chinamoney.com.cn",
  };
}

export async function fetchChinaMoneyCurveHis(params: {
  bondType: ChinaMoneyBondType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  termId?: ChinaMoneyTermId;
  pageNum?: number;
  pageSize?: number;
}): Promise<ChinaMoneyResponse> {
  const url = new URL("https://www.chinamoney.com.cn/ags/ms/cm-u-bk-currency/ClsYldCurvHis");
  url.searchParams.set("lang", "CN");
  url.searchParams.set("reference", "1,2,3");
  url.searchParams.set("bondType", params.bondType);
  url.searchParams.set("startDate", params.startDate);
  url.searchParams.set("endDate", params.endDate);
  url.searchParams.set("termId", params.termId || "1");
  url.searchParams.set("pageNum", String(params.pageNum ?? 1));
  url.searchParams.set("pageSize", String(params.pageSize ?? 200));

  const res = await fetch(url.toString(), { cache: "no-store", headers: headers() });
  if (!res.ok) throw new Error(`ChinaMoney HTTP ${res.status}`);
  return (await res.json()) as ChinaMoneyResponse;
}

// Parse records into { date -> { tenorYears -> yield } }
export function buildDateTenorMap(resp: ChinaMoneyResponse) {
  const out = new Map<string, Map<number, number>>();
  const recs = resp.records || [];
  for (const r of recs) {
    const date = r.newDateValueCN;
    const tenor = toNum(r.yearTermStr);
    const y = toNum(r.maturityYieldStr);
    if (!date || tenor === null || y === null) continue;
    if (!out.has(date)) out.set(date, new Map());
    out.get(date)!.set(tenor, y);
  }
  return out;
}

export async function fetchLatestTenors(params: {
  bondType: ChinaMoneyBondType;
  startDate: string;
  endDate: string;
  tenors: number[]; // in years, e.g. [2,5,10]
}): Promise<{ asOf: string; yields: Record<string, number> } | null> {
  const resp = await fetchChinaMoneyCurveHis({
    bondType: params.bondType,
    startDate: params.startDate,
    endDate: params.endDate,
    termId: "1",
    pageNum: 1,
    pageSize: 500,
  });

  const map = buildDateTenorMap(resp);
  const dates = Array.from(map.keys()).sort();
  const asOf = dates[dates.length - 1];
  if (!asOf) return null;

  const tenMap = map.get(asOf);
  if (!tenMap) return null;

  const yields: Record<string, number> = {};
  for (const t of params.tenors) {
    const v = tenMap.get(t);
    if (v !== undefined) yields[String(t)] = v;
  }

  return { asOf, yields };
}
