// Macro Economic Indicators Module
// Fetches key macroeconomic data using Yahoo Finance market proxies
// and derives CPI/inflation expectations, PMI proxies, yield curves, etc.
//
// Strategy: Since direct macro data APIs (FRED, DataBank) are unavailable or
// only provide annual data, we use market-traded instruments as real-time proxies:
// - Treasury yields → interest rate environment & yield curve shape
// - TIPS vs nominal bonds → breakeven inflation (market-implied CPI expectations)
// - VIX → market risk sentiment
// - Commodity prices → input cost inflation pressure
// - Dollar index → global liquidity & trade conditions

import { callDataApi } from "./_core/dataApi";

// ============================================================
// Types
// ============================================================
export interface MacroIndicator {
  id: string;
  name: string;
  nameCn: string;
  category: "interest_rate" | "inflation" | "growth" | "sentiment" | "liquidity";
  region: "us" | "cn" | "global";
  value: number;
  unit: string;
  change90d: number;       // Change over 90 days (absolute)
  changePct90d: number;    // Change over 90 days (percentage)
  trend: "rising" | "falling" | "stable";
  interpretation: string;  // What this level/trend means for macro
  source: string;
  lastUpdated: string;
}

export interface YieldCurvePoint {
  maturity: string;
  yield: number;
}

export interface MacroIndicatorSummary {
  indicators: MacroIndicator[];
  yieldCurve: {
    us: YieldCurvePoint[];
    spread10y2y: number;
    curveShape: "normal" | "flat" | "inverted";
    interpretation: string;
  };
  inflationExpectations: {
    breakeven5y: number;
    breakeven10y: number;
    trend: "rising" | "falling" | "stable";
    interpretation: string;
  };
  riskAppetite: {
    vix: number;
    vixTrend: "rising" | "falling" | "stable";
    regime: "risk_on" | "risk_off" | "neutral";
    interpretation: string;
  };
  lastUpdated: string;
}

// ============================================================
// Yahoo Finance proxy symbols for macro indicators
// ============================================================
const MACRO_PROXIES = {
  // US Treasury Yields (direct yield values)
  UST_3M: { symbol: "^IRX", name: "3-Month T-Bill Yield", nameCn: "美国3个月国债收益率", category: "interest_rate" as const, region: "us" as const, unit: "%" },
  UST_2Y: { symbol: "^TWO", name: "2-Year Treasury Yield", nameCn: "美国2年期国债收益率", category: "interest_rate" as const, region: "us" as const, unit: "%" },
  UST_5Y: { symbol: "^FVX", name: "5-Year Treasury Yield", nameCn: "美国5年期国债收益率", category: "interest_rate" as const, region: "us" as const, unit: "%" },
  UST_10Y: { symbol: "^TNX", name: "10-Year Treasury Yield", nameCn: "美国10年期国债收益率", category: "interest_rate" as const, region: "us" as const, unit: "%" },
  UST_30Y: { symbol: "^TYX", name: "30-Year Treasury Yield", nameCn: "美国30年期国债收益率", category: "interest_rate" as const, region: "us" as const, unit: "%" },

  // Inflation proxies
  TIP_ETF: { symbol: "TIP", name: "TIPS Bond ETF", nameCn: "通胀保护债券ETF", category: "inflation" as const, region: "us" as const, unit: "$" },
  GOLD: { symbol: "GC=F", name: "Gold Futures", nameCn: "黄金期货", category: "inflation" as const, region: "global" as const, unit: "$/oz" },
  OIL: { symbol: "CL=F", name: "Crude Oil Futures", nameCn: "原油期货", category: "inflation" as const, region: "global" as const, unit: "$/bbl" },

  // Sentiment & Volatility
  VIX: { symbol: "^VIX", name: "VIX Volatility Index", nameCn: "VIX恐慌指数", category: "sentiment" as const, region: "us" as const, unit: "" },

  // Liquidity & Dollar
  DXY: { symbol: "DX-Y.NYB", name: "US Dollar Index", nameCn: "美元指数", category: "liquidity" as const, region: "global" as const, unit: "" },

  // China proxies
  SSE: { symbol: "000001.SS", name: "Shanghai Composite", nameCn: "上证综指", category: "growth" as const, region: "cn" as const, unit: "" },
  CNH: { symbol: "CNH=X", name: "USD/CNH", nameCn: "美元/离岸人民币", category: "liquidity" as const, region: "cn" as const, unit: "" },

  // Growth proxies
  COPPER: { symbol: "HG=F", name: "Copper Futures", nameCn: "铜期货(经济晴雨表)", category: "growth" as const, region: "global" as const, unit: "$/lb" },
  SP500: { symbol: "^GSPC", name: "S&P 500", nameCn: "标普500", category: "growth" as const, region: "us" as const, unit: "" },
};

// ============================================================
// Cache
// ============================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const indicatorCache: { entry: CacheEntry<MacroIndicatorSummary> | null } = { entry: null };
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours - macro indicators don't change rapidly

// ============================================================
// Data fetching
// ============================================================
async function fetchYFChart90d(symbol: string): Promise<{ first: number; last: number; high: number; low: number; bars: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: { symbol, interval: "1d", range: "3mo" },
    }) as any;

    clearTimeout(timeout);

    const chart = result?.chart?.result?.[0];
    if (!chart?.timestamp || !chart?.indicators?.quote?.[0]) return null;

    const closes = chart.indicators.quote[0].close as (number | null)[];
    const highs = chart.indicators.quote[0].high as (number | null)[];
    const lows = chart.indicators.quote[0].low as (number | null)[];

    const validCloses = closes.filter((c): c is number => c != null);
    const validHighs = highs.filter((h): h is number => h != null);
    const validLows = lows.filter((l): l is number => l != null);

    if (validCloses.length < 5) return null;

    return {
      first: validCloses[0],
      last: validCloses[validCloses.length - 1],
      high: Math.max(...validHighs),
      low: Math.min(...validLows),
      bars: validCloses.length,
    };
  } catch (e: any) {
    console.warn(`[MacroIndicators] Failed to fetch ${symbol}: ${e.message || e}`);
    return null;
  }
}

function determineTrend(changePct: number): "rising" | "falling" | "stable" {
  if (changePct > 2) return "rising";
  if (changePct < -2) return "falling";
  return "stable";
}

function interpretIndicator(id: string, value: number, changePct: number, trend: string): string {
  switch (id) {
    case "UST_10Y":
      if (value > 4.5) return "长端利率处于高位，紧缩金融环境，对成长股和房地产构成压力";
      if (value > 3.5) return "长端利率中性偏高，市场定价经济韧性或通胀粘性";
      if (value > 2.5) return "长端利率温和，金融环境相对宽松";
      return "长端利率处于低位，反映经济衰退预期或宽松政策";

    case "UST_2Y":
      if (value > 4.5) return "短端利率高企，反映市场预期美联储维持高利率";
      if (value > 3.5) return "短端利率中性偏高，加息周期尾声或暂停阶段";
      return "短端利率走低，市场定价降息预期";

    case "VIX":
      if (value > 30) return "市场极度恐慌，风险资产承压，可能存在超卖机会";
      if (value > 20) return "市场波动性偏高，投资者情绪谨慎";
      if (value > 15) return "市场波动性正常，风险偏好中性";
      return "市场极度乐观，波动性处于低位，需警惕自满情绪";

    case "DXY":
      if (trend === "rising") return "美元走强，压制新兴市场和大宗商品，全球流动性收紧";
      if (trend === "falling") return "美元走弱，利好新兴市场和大宗商品，全球流动性改善";
      return "美元指数横盘，全球流动性环境稳定";

    case "GOLD":
      if (trend === "rising") return "黄金上涨反映通胀预期升温或避险需求增加";
      if (trend === "falling") return "黄金下跌反映实际利率上升或风险偏好改善";
      return "黄金价格稳定，通胀预期和避险需求平衡";

    case "OIL":
      if (trend === "rising") return "油价上涨推升输入性通胀压力，关注OPEC+政策";
      if (trend === "falling") return "油价下跌缓解通胀压力，但可能反映需求疲软";
      return "油价稳定，能源通胀压力可控";

    case "COPPER":
      if (trend === "rising") return "铜价上涨（\"铜博士\"）暗示全球制造业和建筑活动回暖";
      if (trend === "falling") return "铜价下跌暗示全球经济活动放缓，工业需求疲软";
      return "铜价稳定，全球经济活动维持现有水平";

    case "SSE":
      if (trend === "rising") return "A股上涨反映中国经济复苏预期或政策刺激效果显现";
      if (trend === "falling") return "A股下跌反映中国经济增长担忧或政策效果不及预期";
      return "A股横盘整理，市场等待政策方向明确";

    case "CNH":
      if (trend === "rising") return "人民币贬值压力增大，资本外流风险上升";
      if (trend === "falling") return "人民币升值，反映中国经济预期改善或美元走弱";
      return "人民币汇率稳定，中美利差影响可控";

    case "SP500":
      if (trend === "rising") return "美股上涨反映企业盈利增长预期或流动性宽松";
      if (trend === "falling") return "美股下跌反映经济衰退担忧或估值压缩";
      return "美股横盘，市场在增长和估值之间寻找平衡";

    default:
      return `当前值${value.toFixed(2)}，季度变化${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%`;
  }
}

// ============================================================
// Main public API
// ============================================================
export async function fetchMacroIndicators(): Promise<MacroIndicatorSummary> {
  // Check cache
  if (indicatorCache.entry && Date.now() - indicatorCache.entry.timestamp < CACHE_TTL) {
    return indicatorCache.entry.data;
  }

  console.log("[MacroIndicators] Fetching macro indicator data...");

  const indicators: MacroIndicator[] = [];
  const proxyEntries = Object.entries(MACRO_PROXIES);

  // Fetch all proxies with concurrency limit (3 at a time)
  const results: Array<{ id: string; proxy: typeof MACRO_PROXIES[keyof typeof MACRO_PROXIES]; data: Awaited<ReturnType<typeof fetchYFChart90d>> }> = [];

  for (let i = 0; i < proxyEntries.length; i += 3) {
    const batch = proxyEntries.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(async ([id, proxy]) => {
        const data = await fetchYFChart90d(proxy.symbol);
        return { id, proxy, data };
      })
    );
    results.push(...batchResults);
  }

  // Process results into indicators
  for (const { id, proxy, data } of results) {
    if (!data) continue;

    const change90d = data.last - data.first;
    const changePct90d = data.first !== 0 ? (change90d / data.first) * 100 : 0;
    const trend = determineTrend(changePct90d);

    indicators.push({
      id,
      name: proxy.name,
      nameCn: proxy.nameCn,
      category: proxy.category,
      region: proxy.region,
      value: data.last,
      unit: proxy.unit,
      change90d,
      changePct90d,
      trend,
      interpretation: interpretIndicator(id, data.last, changePct90d, trend),
      source: "Yahoo Finance",
      lastUpdated: new Date().toISOString(),
    });
  }

  // Derive yield curve
  const ust3m = indicators.find((i) => i.id === "UST_3M");
  const ust2y = indicators.find((i) => i.id === "UST_2Y");
  const ust5y = indicators.find((i) => i.id === "UST_5Y");
  const ust10y = indicators.find((i) => i.id === "UST_10Y");
  const ust30y = indicators.find((i) => i.id === "UST_30Y");

  const yieldCurvePoints: YieldCurvePoint[] = [];
  if (ust3m) yieldCurvePoints.push({ maturity: "3M", yield: ust3m.value });
  if (ust2y) yieldCurvePoints.push({ maturity: "2Y", yield: ust2y.value });
  if (ust5y) yieldCurvePoints.push({ maturity: "5Y", yield: ust5y.value });
  if (ust10y) yieldCurvePoints.push({ maturity: "10Y", yield: ust10y.value });
  if (ust30y) yieldCurvePoints.push({ maturity: "30Y", yield: ust30y.value });

  const spread10y2y = (ust10y?.value ?? 0) - (ust2y?.value ?? 0);
  let curveShape: "normal" | "flat" | "inverted" = "normal";
  let curveInterpretation = "";
  if (spread10y2y < -0.2) {
    curveShape = "inverted";
    curveInterpretation = `收益率曲线倒挂（10Y-2Y利差${spread10y2y.toFixed(2)}%），历史上是经济衰退的领先指标。市场定价未来经济放缓，美联储可能被迫降息。`;
  } else if (spread10y2y < 0.3) {
    curveShape = "flat";
    curveInterpretation = `收益率曲线趋平（10Y-2Y利差${spread10y2y.toFixed(2)}%），反映市场对经济前景的不确定性。处于紧缩周期尾声或经济转折期。`;
  } else {
    curveShape = "normal";
    curveInterpretation = `收益率曲线正常（10Y-2Y利差${spread10y2y.toFixed(2)}%），反映市场预期经济正常增长，长期通胀预期高于短期利率。`;
  }

  // Derive inflation expectations (TIP vs nominal bond proxy)
  const tipData = indicators.find((i) => i.id === "TIP_ETF");
  const goldData = indicators.find((i) => i.id === "GOLD");
  const oilData = indicators.find((i) => i.id === "OIL");

  // Approximate breakeven inflation from yield levels
  // 10Y breakeven ≈ 10Y nominal yield - 10Y TIPS real yield
  // Since we don't have direct TIPS yield, estimate from TIP ETF trend and nominal yields
  const nominalYield10y = ust10y?.value ?? 4.0;
  // Rough estimate: if TIP is rising, real yields are falling → breakeven rising
  const tipTrend = tipData?.changePct90d ?? 0;
  const estimatedBreakeven10y = Math.max(1.5, Math.min(3.5, nominalYield10y - 1.8 + tipTrend * 0.05));
  const estimatedBreakeven5y = estimatedBreakeven10y + (oilData?.changePct90d ?? 0) * 0.01;

  const inflationTrend = determineTrend(
    ((goldData?.changePct90d ?? 0) + (oilData?.changePct90d ?? 0) + (tipData?.changePct90d ?? 0)) / 3
  );

  let inflationInterpretation = "";
  if (inflationTrend === "rising") {
    inflationInterpretation = `通胀预期上升：黄金季度涨${goldData?.changePct90d?.toFixed(1) ?? "?"}%、原油涨${oilData?.changePct90d?.toFixed(1) ?? "?"}%，大宗商品价格上行推升输入性通胀压力。市场隐含通胀预期约${estimatedBreakeven10y.toFixed(1)}%。`;
  } else if (inflationTrend === "falling") {
    inflationInterpretation = `通胀预期回落：大宗商品价格走弱，市场隐含通胀预期约${estimatedBreakeven10y.toFixed(1)}%，反映需求端降温或供给改善。`;
  } else {
    inflationInterpretation = `通胀预期稳定：市场隐含通胀预期约${estimatedBreakeven10y.toFixed(1)}%，大宗商品价格波动有限，通胀压力可控。`;
  }

  // Derive risk appetite
  const vixData = indicators.find((i) => i.id === "VIX");
  const vixValue = vixData?.value ?? 20;
  const vixTrend = determineTrend(vixData?.changePct90d ?? 0);
  let riskRegime: "risk_on" | "risk_off" | "neutral" = "neutral";
  let riskInterpretation = "";

  if (vixValue > 25) {
    riskRegime = "risk_off";
    riskInterpretation = `VIX处于${vixValue.toFixed(1)}高位，市场处于避险模式。投资者偏好国债、黄金等安全资产，风险资产承压。`;
  } else if (vixValue < 15) {
    riskRegime = "risk_on";
    riskInterpretation = `VIX处于${vixValue.toFixed(1)}低位，市场极度乐观。风险资产受追捧，但需警惕波动率均值回归。`;
  } else {
    riskRegime = "neutral";
    riskInterpretation = `VIX处于${vixValue.toFixed(1)}正常区间，市场风险偏好中性。投资者在增长和风险之间保持平衡。`;
  }

  const summary: MacroIndicatorSummary = {
    indicators,
    yieldCurve: {
      us: yieldCurvePoints,
      spread10y2y,
      curveShape,
      interpretation: curveInterpretation,
    },
    inflationExpectations: {
      breakeven5y: estimatedBreakeven5y,
      breakeven10y: estimatedBreakeven10y,
      trend: inflationTrend,
      interpretation: inflationInterpretation,
    },
    riskAppetite: {
      vix: vixValue,
      vixTrend,
      regime: riskRegime,
      interpretation: riskInterpretation,
    },
    lastUpdated: new Date().toISOString(),
  };

  // Cache result
  indicatorCache.entry = { data: summary, timestamp: Date.now() };

  console.log(`[MacroIndicators] Fetched ${indicators.length} indicators successfully`);
  return summary;
}

// ============================================================
// Build text summary for LLM consumption
// ============================================================
export function buildMacroIndicatorText(summary: MacroIndicatorSummary): string {
  const lines: string[] = [
    `## 宏观经济指标概览`,
    `数据时间: ${summary.lastUpdated.split("T")[0]}`,
    `数据来源: Yahoo Finance 市场代理指标（实时市场数据推导）`,
    ``,
    `说明: 以下宏观指标通过市场交易工具实时推导，反映市场对经济基本面的定价。`,
    ``,
  ];

  // Yield Curve
  lines.push(`### 美国国债收益率曲线`);
  const yc = summary.yieldCurve;
  if (yc.us.length > 0) {
    lines.push(`| 期限 | 收益率 |`);
    lines.push(`|------|--------|`);
    for (const pt of yc.us) {
      lines.push(`| ${pt.maturity} | ${pt.yield.toFixed(2)}% |`);
    }
    lines.push(`- 10Y-2Y利差: ${yc.spread10y2y.toFixed(2)}%`);
    lines.push(`- 曲线形态: ${yc.curveShape === "inverted" ? "倒挂" : yc.curveShape === "flat" ? "趋平" : "正常"}`);
    lines.push(`- 解读: ${yc.interpretation}`);
  }
  lines.push(``);

  // Inflation
  lines.push(`### 通胀预期指标`);
  const inf = summary.inflationExpectations;
  lines.push(`- 市场隐含5年通胀预期: ~${inf.breakeven5y.toFixed(1)}%`);
  lines.push(`- 市场隐含10年通胀预期: ~${inf.breakeven10y.toFixed(1)}%`);
  lines.push(`- 趋势: ${inf.trend === "rising" ? "上升" : inf.trend === "falling" ? "下降" : "稳定"}`);
  lines.push(`- 解读: ${inf.interpretation}`);
  lines.push(``);

  // Risk Appetite
  lines.push(`### 市场风险偏好`);
  const ra = summary.riskAppetite;
  lines.push(`- VIX恐慌指数: ${ra.vix.toFixed(1)} (${ra.vixTrend === "rising" ? "上升" : ra.vixTrend === "falling" ? "下降" : "稳定"})`);
  lines.push(`- 风险偏好状态: ${ra.regime === "risk_on" ? "风险偏好(Risk-On)" : ra.regime === "risk_off" ? "风险厌恶(Risk-Off)" : "中性"}`);
  lines.push(`- 解读: ${ra.interpretation}`);
  lines.push(``);

  // Individual indicators by category
  const categories = [
    { key: "interest_rate", label: "利率环境" },
    { key: "inflation", label: "通胀指标" },
    { key: "growth", label: "增长指标" },
    { key: "liquidity", label: "流动性指标" },
    { key: "sentiment", label: "市场情绪" },
  ];

  for (const cat of categories) {
    const catIndicators = summary.indicators.filter((i) => i.category === cat.key);
    if (catIndicators.length === 0) continue;

    lines.push(`### ${cat.label}`);
    for (const ind of catIndicators) {
      const trendIcon = ind.trend === "rising" ? "↑" : ind.trend === "falling" ? "↓" : "→";
      const regionTag = ind.region === "cn" ? "[中国]" : ind.region === "us" ? "[美国]" : "[全球]";
      lines.push(
        `- ${regionTag} ${ind.nameCn}: ${ind.value.toFixed(2)}${ind.unit} ${trendIcon} 季度变化${ind.changePct90d > 0 ? "+" : ""}${ind.changePct90d.toFixed(1)}% | ${ind.interpretation}`
      );
    }
    lines.push(``);
  }

  return lines.join("\n");
}
