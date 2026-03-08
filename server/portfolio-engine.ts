// Portfolio Engine — Risk Parity Multi-Asset Portfolio Construction
// Methodology: Equal Risk Contribution (ERC) across 6 asset segments
// Combined with macro master trader strategic overlay via LLM
//
// Asset segments: cn_stocks, cn_bonds, us_stocks, us_bonds, gold, other_markets
// Representative ETFs used for each segment to compute risk metrics

import { fetchAggs, getDateRange } from "./market-data";
import { invokeLLM } from "./_core/llm";

// ============================================================
// Types
// ============================================================

export interface PortfolioAsset {
  assetClass: string;
  label: string;
  flag: string;
  symbol: string;        // Representative ETF/instrument
  symbolName: string;
  weight: number;         // Portfolio weight (0-1)
  riskContribution: number; // Marginal risk contribution (0-1)
  annualizedVol: number;  // Individual annualized volatility (%)
  quarterReturn: number;  // 90-day return (%)
  sharpeContribution: number; // Contribution to portfolio Sharpe
}

export interface PortfolioMetrics {
  annualizedVol: number;        // Portfolio annualized volatility (%)
  expectedReturn: number;       // Estimated annualized return (%)
  sharpeRatio: number;          // Sharpe ratio (rf = risk-free rate proxy)
  maxDrawdown: number;          // Max drawdown over period (%)
  calmarRatio: number;          // Return / MaxDrawdown
  diversificationRatio: number; // Weighted avg vol / portfolio vol
  riskFreeRate: number;         // Risk-free rate used (%)
}

export interface PortfolioRecommendation {
  name: string;
  description: string;
  methodology: string;
  assets: PortfolioAsset[];
  metrics: PortfolioMetrics;
  strategicOverlay: string;     // LLM-generated macro strategy commentary
  rebalanceSignal: string;      // "hold" | "rebalance" | "tactical_shift"
  lastUpdated: string;
}

// ============================================================
// Representative instruments for each segment
// ============================================================
const SEGMENT_PROXIES: Record<string, { symbol: string; name: string; label: string; flag: string }> = {
  cn_stocks:     { symbol: "MCHI",  name: "MSCI中国ETF",     label: "中国股票", flag: "🇨🇳" },
  cn_bonds:      { symbol: "CBON",  name: "中国债券ETF",     label: "中国债券", flag: "🇨🇳" },
  us_stocks:     { symbol: "SPY",   name: "标普500ETF",      label: "美国股票", flag: "🇺🇸" },
  us_bonds:      { symbol: "TLT",   name: "美国长期国债ETF", label: "美国债券", flag: "🇺🇸" },
  gold:          { symbol: "GC=F",  name: "黄金期货",        label: "黄金",     flag: "🌐" },
  other_markets: { symbol: "EEM",   name: "新兴市场ETF",     label: "其他市场", flag: "🌐" },
};

// ============================================================
// Math utilities
// ============================================================

/** Compute daily log returns from price series */
function computeLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return returns;
}

/** Compute mean of array */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Compute standard deviation */
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** Compute covariance between two return series */
function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
  }
  return cov / (n - 1);
}

/** Build covariance matrix from multiple return series */
function buildCovarianceMatrix(returnSeries: number[][]): number[][] {
  const n = returnSeries.length;
  const covMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const cov = covariance(returnSeries[i], returnSeries[j]);
      covMatrix[i][j] = cov;
      covMatrix[j][i] = cov;
    }
  }
  return covMatrix;
}

/** Compute portfolio variance given weights and covariance matrix */
function portfolioVariance(weights: number[], covMatrix: number[][]): number {
  let variance = 0;
  const n = weights.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return variance;
}

/** Compute portfolio volatility */
function portfolioVol(weights: number[], covMatrix: number[][]): number {
  return Math.sqrt(portfolioVariance(weights, covMatrix));
}

/** Compute marginal risk contributions for each asset */
function marginalRiskContributions(weights: number[], covMatrix: number[][]): number[] {
  const n = weights.length;
  const pVol = portfolioVol(weights, covMatrix);
  if (pVol === 0) return weights.map(() => 1 / n);

  // Sigma * w
  const sigmaW: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sigmaW[i] += covMatrix[i][j] * weights[j];
    }
  }

  // MRC_i = w_i * (Sigma * w)_i / sigma_p
  const mrc: number[] = [];
  for (let i = 0; i < n; i++) {
    mrc.push((weights[i] * sigmaW[i]) / pVol);
  }

  // Normalize to sum to 1
  const total = mrc.reduce((s, v) => s + v, 0);
  return total > 0 ? mrc.map((v) => v / total) : weights.map(() => 1 / n);
}

/**
 * Risk Parity (Equal Risk Contribution) optimization
 * Uses iterative Newton-like method to find weights where each asset
 * contributes equally to total portfolio risk.
 *
 * Algorithm: Spinu (2013) cyclical coordinate descent
 */
function riskParityWeights(covMatrix: number[][], maxIter: number = 500, tol: number = 1e-8): number[] {
  const n = covMatrix.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  // Target: equal risk budget (1/n each)
  const budget = Array(n).fill(1 / n);

  // Initialize with inverse-vol weights
  let weights = covMatrix.map((_, i) => {
    const vol = Math.sqrt(covMatrix[i][i]);
    return vol > 0 ? 1 / vol : 1;
  });
  const wSum = weights.reduce((s, v) => s + v, 0);
  weights = weights.map((w) => w / wSum);

  for (let iter = 0; iter < maxIter; iter++) {
    const pVar = portfolioVariance(weights, covMatrix);
    const pVol = Math.sqrt(pVar);
    if (pVol === 0) break;

    // Compute Sigma * w
    const sigmaW: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sigmaW[i] += covMatrix[i][j] * weights[j];
      }
    }

    // Risk contribution: RC_i = w_i * (Sigma * w)_i
    const rc: number[] = weights.map((w, i) => w * sigmaW[i]);
    const rcTotal = rc.reduce((s, v) => s + v, 0);

    // Check convergence: all RC_i / total ≈ budget_i
    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(rc[i] / rcTotal - budget[i]));
    }
    if (maxDiff < tol) break;

    // Update weights: w_i_new = w_i * (budget_i / (RC_i / rcTotal))
    const newWeights: number[] = [];
    for (let i = 0; i < n; i++) {
      const rcPct = rc[i] / rcTotal;
      const ratio = rcPct > 0 ? budget[i] / rcPct : 1;
      // Damped update to avoid oscillation
      newWeights.push(weights[i] * (0.5 + 0.5 * ratio));
    }

    // Normalize
    const nwSum = newWeights.reduce((s, v) => s + v, 0);
    weights = newWeights.map((w) => w / nwSum);
  }

  return weights;
}

/** Compute maximum drawdown from a price series */
function maxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let maxDD = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD * 100; // percentage
}

// ============================================================
// Cache
// ============================================================
let portfolioCache: { data: PortfolioRecommendation; timestamp: number } | null = null;
const PORTFOLIO_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

// ============================================================
// Main portfolio construction function
// ============================================================
export async function buildRiskParityPortfolio(
  marketDataSummary?: string,
  macroIndicatorText?: string
): Promise<PortfolioRecommendation | null> {
  // Check cache
  if (portfolioCache && Date.now() - portfolioCache.timestamp < PORTFOLIO_CACHE_TTL) {
    return portfolioCache.data;
  }

  try {
    const segments = Object.keys(SEGMENT_PROXIES);
    const { from, to } = getDateRange(90);

    // Fetch 90-day historical data for all proxy instruments
    const historyResults = await Promise.all(
      segments.map(async (seg) => {
        const proxy = SEGMENT_PROXIES[seg];
        try {
          const aggs = await fetchAggs(proxy.symbol, 1, "day", from, to);
          const closes = aggs.map((a) => a.c).filter((c) => c > 0);
          return { segment: seg, proxy, closes, aggs };
        } catch (e) {
          console.warn(`[Portfolio] Failed to fetch ${proxy.symbol}: ${e}`);
          return { segment: seg, proxy, closes: [] as number[], aggs: [] as any[] };
        }
      })
    );

    // Filter out segments with insufficient data
    const validSegments = historyResults.filter((r) => r.closes.length >= 20);
    if (validSegments.length < 3) {
      console.error("[Portfolio] Insufficient data for portfolio construction");
      return null;
    }

    // Compute log returns for each segment
    const returnSeries = validSegments.map((r) => computeLogReturns(r.closes));

    // Align return series to same length (shortest)
    const minLen = Math.min(...returnSeries.map((r) => r.length));
    const alignedReturns = returnSeries.map((r) => r.slice(r.length - minLen));

    // Build covariance matrix (daily)
    const covMatrix = buildCovarianceMatrix(alignedReturns);

    // Compute risk parity weights
    const rpWeights = riskParityWeights(covMatrix);

    // Compute individual metrics
    const annualizationFactor = Math.sqrt(252);
    const assets: PortfolioAsset[] = validSegments.map((seg, i) => {
      const dailyVol = stdDev(alignedReturns[i]);
      const annVol = dailyVol * annualizationFactor * 100;
      const firstClose = seg.closes[0];
      const lastClose = seg.closes[seg.closes.length - 1];
      const quarterReturn = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;

      return {
        assetClass: seg.segment,
        label: seg.proxy.label,
        flag: seg.proxy.flag,
        symbol: seg.proxy.symbol,
        symbolName: seg.proxy.name,
        weight: rpWeights[i],
        riskContribution: 0, // will be computed below
        annualizedVol: annVol,
        quarterReturn,
        sharpeContribution: 0,
      };
    });

    // Compute marginal risk contributions
    const mrc = marginalRiskContributions(rpWeights, covMatrix);
    assets.forEach((a, i) => {
      a.riskContribution = mrc[i];
    });

    // Portfolio-level metrics
    const dailyPortVol = portfolioVol(rpWeights, covMatrix);
    const annPortVol = dailyPortVol * annualizationFactor * 100;

    // Compute portfolio daily returns for Sharpe and drawdown
    const portfolioDailyReturns: number[] = [];
    for (let t = 0; t < minLen; t++) {
      let portReturn = 0;
      for (let i = 0; i < rpWeights.length; i++) {
        portReturn += rpWeights[i] * alignedReturns[i][t];
      }
      portfolioDailyReturns.push(portReturn);
    }

    const avgDailyReturn = mean(portfolioDailyReturns);
    const annReturn = avgDailyReturn * 252 * 100;

    // Risk-free rate proxy: use 3-month T-bill rate (~4.5% in current environment)
    // This is a rough estimate; in production would fetch from API
    const riskFreeRate = 4.5;
    const excessReturn = annReturn - riskFreeRate;
    const sharpeRatio = annPortVol > 0 ? excessReturn / annPortVol : 0;

    // Compute portfolio cumulative prices for max drawdown
    const portfolioPrices: number[] = [100]; // start at 100
    for (const r of portfolioDailyReturns) {
      portfolioPrices.push(portfolioPrices[portfolioPrices.length - 1] * Math.exp(r));
    }
    const mdd = maxDrawdown(portfolioPrices);
    const calmarRatio = mdd > 0 ? annReturn / mdd : 0;

    // Diversification ratio
    const weightedAvgVol = assets.reduce((s, a) => s + a.weight * a.annualizedVol, 0);
    const diversificationRatio = annPortVol > 0 ? weightedAvgVol / annPortVol : 1;

    // Sharpe contribution per asset
    assets.forEach((a) => {
      a.sharpeContribution = a.riskContribution * sharpeRatio;
    });

    const metrics: PortfolioMetrics = {
      annualizedVol: annPortVol,
      expectedReturn: annReturn,
      sharpeRatio,
      maxDrawdown: mdd,
      calmarRatio,
      diversificationRatio,
      riskFreeRate,
    };

    // Generate LLM strategic overlay
    let strategicOverlay = "";
    let rebalanceSignal: "hold" | "rebalance" | "tactical_shift" = "hold";

    try {
      const overlayResult = await generateStrategicOverlay(assets, metrics, marketDataSummary, macroIndicatorText);
      if (overlayResult) {
        strategicOverlay = overlayResult.commentary || "";
        rebalanceSignal = overlayResult.signal || "hold";
      }
    } catch (e) {
      console.warn("[Portfolio] LLM overlay failed, using default:", e);
      strategicOverlay = "基于风险平价模型的等风险贡献配置。当前组合在六大资产板块间实现了均衡的风险分散。";
    }

    const recommendation: PortfolioRecommendation = {
      name: "AI宏观作手·风险平价组合",
      description: "基于风险平价（Risk Parity）模型构建的多资产投资组合，结合宏观作手策略视角进行战术调整。",
      methodology: "等风险贡献（Equal Risk Contribution）：每个资产板块对组合总风险的贡献相等，通过协方差矩阵优化权重分配。",
      assets: assets.sort((a, b) => b.weight - a.weight),
      metrics,
      strategicOverlay,
      rebalanceSignal,
      lastUpdated: new Date().toISOString(),
    };

    // Cache result
    portfolioCache = { data: recommendation, timestamp: Date.now() };

    return recommendation;
  } catch (e) {
    console.error("[Portfolio] Construction failed:", e);
    return null;
  }
}

// ============================================================
// LLM Strategic Overlay
// ============================================================
async function generateStrategicOverlay(
  assets: PortfolioAsset[],
  metrics: PortfolioMetrics,
  marketDataSummary?: string,
  macroIndicatorText?: string
): Promise<{ commentary: string; signal: "hold" | "rebalance" | "tactical_shift" } | null> {
  const assetSummary = assets
    .map((a) => `${a.label}(${a.symbol}): 权重${(a.weight * 100).toFixed(1)}%, 年化波动率${a.annualizedVol.toFixed(1)}%, 季度收益${a.quarterReturn.toFixed(2)}%`)
    .join("\n");

  const metricsSummary = `组合年化波动率: ${metrics.annualizedVol.toFixed(2)}%
组合年化收益: ${metrics.expectedReturn.toFixed(2)}%
夏普比率: ${metrics.sharpeRatio.toFixed(2)}
最大回撤: ${metrics.maxDrawdown.toFixed(2)}%
卡尔玛比率: ${metrics.calmarRatio.toFixed(2)}
分散化比率: ${metrics.diversificationRatio.toFixed(2)}`;

  const macroContext = [macroIndicatorText, marketDataSummary].filter(Boolean).join("\n\n---\n\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是"AI宏观作手"——一位世界级的全球宏观策略分析师，精通风险平价（Risk Parity）投资组合管理。

你的分析方法论融合了四大核心维度：
1. 周期分析：债务周期、经济周期位置、跨资产相关性
2. 反身性分析：市场主流偏见与现实基本面的脱节
3. 流动性分析：全球央行政策、M2增速、实际利率
4. 技术趋势：关键点位、200日均线、不对称风险回报比

你需要基于当前宏观环境对风险平价组合给出战术性评论和调整建议。
请用中文回答，语言风格专业、果断、冷静。
重要：你的回答必须是严格合法的JSON格式。`,
        },
        {
          role: "user",
          content: `以下是基于风险平价模型构建的多资产投资组合，请从宏观作手的视角给出战术性评论。

## 当前组合配置
${assetSummary}

## 组合风险指标
${metricsSummary}

${macroContext ? `## 最新宏观数据\n${macroContext}` : ""}

请以JSON格式返回：
{
  "commentary": "2-3段战术性评论（使用\\n分段）。内容应包含：1)对当前风险平价配置的评价 2)基于宏观环境的战术调整建议（如哪些板块可以超配/低配） 3)关键风险提示。不要超过300字。",
  "signal": "hold" | "rebalance" | "tactical_shift"
}

signal说明：
- "hold": 当前配置合理，维持不变
- "rebalance": 偏离目标权重较大，建议再平衡
- "tactical_shift": 宏观环境发生重大变化，建议战术性调整`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    return {
      commentary: parsed.commentary || "",
      signal: ["hold", "rebalance", "tactical_shift"].includes(parsed.signal) ? parsed.signal : "hold",
    };
  } catch (e) {
    console.warn("[Portfolio] LLM overlay generation failed:", e);
    return null;
  }
}
