// FRED API Client
// Federal Reserve Economic Data API Wrapper
// API Docs: https://fred.stlouisfed.org/docs/api/fred/

const FRED_API_BASE = "https://api.stlouisfed.org/fred";
// NOTE: 展示层(Indicative)允许使用第三方源，但密钥绝不应硬编码进仓库。
const FRED_API_KEY = process.env.FRED_API_KEY || "";

// Key FRED Series IDs
export const FRED_SERIES = {
  // Interest Rates
  FED_FUNDS: "FEDFUNDS",           // Federal Funds Rate
  TREASURY_30Y: "DGS30",          // 30-Year Treasury
  TREASURY_10Y: "DGS10",           // 10-Year Treasury
  TREASURY_5Y: "DGS5",             // 5-Year Treasury
  TREASURY_2Y: "DGS2",             // 2-Year Treasury
  TREASURY_3M: "TB3MS",            // 3-Month Treasury
  
  // Inflation
  CPI: "CPIAUCSL",                 // Consumer Price Index
  CORE_CPI: "CPILFESL",            // Core CPI
  PCE: "PCEPI",                    // PCE Price Index
  
  // Economic Activity
  GDP: "GDP",                      // Gross Domestic Product
  UNEMPLOYMENT: "UNRATE",          // Unemployment Rate
  NONFARM_PAYROLL: "PAYEMS",       // Nonfarm Payrolls
  
  // Money Supply
  M2: "M2SL",                      // M2 Money Stock
  
  // Leading Indicators
  LEADING_INDEX: "USSLIND",        // Leading Economic Index

  // Surveys
  ISM_PMI: "NAPM",                 // ISM Manufacturing PMI
};

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: FredObservation[];
}

// Fetch data from FRED API with fallback
export async function fetchFredSeries(
  seriesId: string,
  limit: number = 12
): Promise<{ date: string; value: number }[] | null> {
  try {
    const url = new URL(`${FRED_API_BASE}/series/observations`);
    url.searchParams.append("series_id", seriesId);
    if (!FRED_API_KEY) {
      // No key configured; caller should use fallback/mock.
      return null;
    }
    url.searchParams.append("api_key", FRED_API_KEY);
    url.searchParams.append("file_type", "json");
    url.searchParams.append("limit", limit.toString());
    url.searchParams.append("sort_order", "desc");

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.error(`[FRED] API error for ${seriesId}: ${response.status}`);
      return null;
    }

    const data: FredResponse = await response.json();
    
    return data.observations
      .filter((obs) => obs.value !== ".")
      .map((obs) => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }))
      .reverse();
  } catch (error) {
    console.error(`[FRED] Fetch error for ${seriesId}:`, error);
    return null;
  }
}

// Get latest value for a series
export async function getLatestFredValue(
  seriesId: string
): Promise<{ date: string; value: number } | null> {
  const data = await fetchFredSeries(seriesId, 1);
  return data && data.length > 0 ? data[0] : null;
}

// Calculate change over period
export async function getFredChange(
  seriesId: string,
  months: number = 12
): Promise<{ current: number; previous: number; change: number; changePercent: number } | null> {
  const data = await fetchFredSeries(seriesId, months + 1);
  if (!data || data.length < 2) return null;

  const current = data[data.length - 1].value;
  const previous = data[0].value;
  const change = current - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

  return { current, previous, change, changePercent };
}

// Yield curve analysis
export async function getYieldCurveData(): Promise<{
  spread10y2y: number;
  curveShape: "normal" | "flat" | "inverted";
  isInverted: boolean;
} | null> {
  const [rate10y, rate2y] = await Promise.all([
    getLatestFredValue(FRED_SERIES.TREASURY_10Y),
    getLatestFredValue(FRED_SERIES.TREASURY_2Y),
  ]);

  if (!rate10y || !rate2y) return null;

  const spread10y2y = rate10y.value - rate2y.value;
  let curveShape: "normal" | "flat" | "inverted" = "normal";

  if (spread10y2y < -0.1) {
    curveShape = "inverted";
  } else if (spread10y2y < 0.3) {
    curveShape = "flat";
  }

  return {
    spread10y2y,
    curveShape,
    isInverted: spread10y2y < 0,
  };
}

// Build macro summary from FRED data
export async function buildFredMacroSummary(): Promise<string | null> {
  try {
    const [
      fedFunds,
      cpi,
      unemployment,
      gdp,
      yieldCurve,
    ] = await Promise.all([
      getLatestFredValue(FRED_SERIES.FED_FUNDS),
      getLatestFredValue(FRED_SERIES.CPI),
      getLatestFredValue(FRED_SERIES.UNEMPLOYMENT),
      getLatestFredValue(FRED_SERIES.GDP),
      getYieldCurveData(),
    ]);

    const lines: string[] = [
      "## 美国宏观经济数据 (FRED)",
      `数据更新时间: ${new Date().toISOString().split("T")[0]}`,
      "",
    ];

    if (fedFunds) {
      lines.push(`### 货币政策`);
      lines.push(`- 联邦基金利率: ${fedFunds.value.toFixed(2)}%`);
      lines.push("");
    }

    if (yieldCurve) {
      lines.push(`### 收益率曲线`);
      lines.push(`- 10Y-2Y利差: ${yieldCurve.spread10y2y.toFixed(2)}%`);
      lines.push(`- 曲线形态: ${yieldCurve.curveShape === "inverted" ? "倒挂⚠️" : yieldCurve.curveShape === "flat" ? "趋平" : "正常"}`);
      if (yieldCurve.isInverted) {
        lines.push(`- ⚠️ 注意: 收益率曲线倒挂通常预示经济衰退风险`);
      }
      lines.push("");
    }

    if (cpi) {
      lines.push(`### 通胀指标`);
      lines.push(`- CPI指数: ${cpi.value.toFixed(1)} (基准=100)`);
      lines.push("");
    }

    if (unemployment) {
      lines.push(`### 就业市场`);
      lines.push(`- 失业率: ${unemployment.value.toFixed(1)}%`);
      lines.push(`- ${unemployment.value < 4 ? "✅ 充分就业" : unemployment.value < 6 ? "⚠️ 温和失业" : "❌ 高失业"}`);
      lines.push("");
    }

    if (gdp) {
      lines.push(`### 经济增长`);
      lines.push(`- GDP (十亿美元): ${(gdp.value / 1000).toFixed(2)}万亿`);
      lines.push("");
    }

    return lines.join("\n");
  } catch (error) {
    console.error("[FRED] Build summary error:", error);
    return null;
  }
}

// Mock data for fallback
const mockFredData: Record<string, { date: string; value: number }[]> = {
  [FRED_SERIES.FED_FUNDS]: [
    { date: "2026-01-01", value: 4.5 },
    { date: "2026-02-01", value: 4.5 },
  ],
  [FRED_SERIES.TREASURY_10Y]: [
    { date: "2026-01-01", value: 4.35 },
    { date: "2026-02-01", value: 4.25 },
  ],
  [FRED_SERIES.TREASURY_2Y]: [
    { date: "2026-01-01", value: 4.15 },
    { date: "2026-02-01", value: 4.10 },
  ],
  [FRED_SERIES.CPI]: [
    { date: "2026-01-01", value: 312.5 },
    { date: "2026-02-01", value: 314.2 },
  ],
  [FRED_SERIES.UNEMPLOYMENT]: [
    { date: "2026-01-01", value: 4.1 },
    { date: "2026-02-01", value: 4.0 },
  ],

  // Treasury curve (mock)
  [FRED_SERIES.TREASURY_5Y]: [
    { date: "2026-01-01", value: 4.25 },
    { date: "2026-02-01", value: 4.18 },
  ],
  [FRED_SERIES.TREASURY_30Y]: [
    { date: "2026-01-01", value: 4.45 },
    { date: "2026-02-01", value: 4.38 },
  ],
};

// Fetch with fallback to mock data
export async function fetchFredWithFallback(
  seriesId: string,
  limit: number = 12
): Promise<{ date: string; value: number }[]> {
  const realData = await fetchFredSeries(seriesId, limit);
  if (realData && realData.length > 0) {
    return realData;
  }

  return mockFredData[seriesId] || [{ date: new Date().toISOString().split("T")[0], value: 0 }];
}

export async function getUsTreasuryCurveLatest(): Promise<
  { maturity: "2Y" | "5Y" | "10Y" | "30Y"; yield: number; change: number; date: string; source: string }[]
> {
  const [y2, y5, y10, y30] = await Promise.all([
    fetchFredWithFallback(FRED_SERIES.TREASURY_2Y, 2),
    fetchFredWithFallback(FRED_SERIES.TREASURY_5Y, 2),
    fetchFredWithFallback(FRED_SERIES.TREASURY_10Y, 2),
    fetchFredWithFallback(FRED_SERIES.TREASURY_30Y, 2),
  ]);

  const calc = (arr: { date: string; value: number }[]) => {
    const curr = arr[arr.length - 1];
    const prev = arr.length > 1 ? arr[arr.length - 2] : curr;
    return { curr, prev };
  };

  const r2 = calc(y2);
  const r5 = calc(y5);
  const r10 = calc(y10);
  const r30 = calc(y30);

  const date = (r10.curr?.date || new Date().toISOString().split("T")[0]);
  const source = FRED_API_KEY ? "FRED" : "FRED(mock)";

  return [
    { maturity: "2Y", yield: r2.curr.value, change: r2.curr.value - r2.prev.value, date, source },
    { maturity: "5Y", yield: r5.curr.value, change: r5.curr.value - r5.prev.value, date, source },
    { maturity: "10Y", yield: r10.curr.value, change: r10.curr.value - r10.prev.value, date, source },
    { maturity: "30Y", yield: r30.curr.value, change: r30.curr.value - r30.prev.value, date, source },
  ];
}
