// Market Data Service — Triple-Source Fallback Architecture
// Priority: Yahoo Finance (via callDataApi) → Finnhub (direct HTTP) → Polygon.io (direct HTTP)
// Yahoo Finance: commodity futures direct pricing (GC=F, SI=F, CL=F), historical K-lines
// Finnhub: real-time quotes with intraday change/percent, 60 calls/min free tier
// Polygon.io: US stocks/ETFs/forex previous-day close, 5 calls/min free tier

import { callDataApi } from "./_core/dataApi";

// ============================================================
// In-Memory Cache
// ============================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }
}

const cache = new DataCache();

const CACHE_TTL = {
  quote: 10 * 60 * 1000,       // 10 minutes for real-time quotes
  aggs: 60 * 60 * 1000,        // 1 hour for historical bars
  sma: 2 * 60 * 60 * 1000,     // 2 hours for SMA
  assetClass: 15 * 60 * 1000,  // 15 minutes for asset class list
  macroSummary: 2 * 60 * 60 * 1000, // 2 hours for macro summary (quarterly trends don't change rapidly)
};

// ============================================================
// API Keys (read from env)
// ============================================================
const FINNHUB_KEY = () => process.env.FINNHUB_API_KEY || "";
const POLYGON_KEY = () => process.env.POLYGON_API_KEY || "";

// ============================================================
// Types
// ============================================================
interface QuoteResult {
  price: number;
  change: number;
  changePercent: number;
  source: "yahoo" | "finnhub" | "polygon";
}

// Polygon-compatible aggregate type (kept for backward compatibility)
interface PolygonAgg {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  t: number;
  n?: number;
}

// Yahoo Finance chart response types
interface YFChartMeta {
  regularMarketPrice: number;
  previousClose: number;
  currency: string;
  symbol: string;
  exchangeName: string;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
}

interface YFQuote {
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
  volume: (number | null)[];
}

interface YFChartResult {
  meta: YFChartMeta;
  timestamp: number[];
  indicators: {
    quote: YFQuote[];
    adjclose?: { adjclose: (number | null)[] }[];
  };
}

interface YFChartResponse {
  chart: {
    result: YFChartResult[] | null;
    error: any;
  };
}

// ============================================================
// Ticker symbol mapping across data sources
// Some symbols differ between Yahoo Finance, Finnhub, and Polygon
// ============================================================
interface TickerMapping {
  yahoo: string;      // Yahoo Finance symbol
  finnhub: string;    // Finnhub symbol (empty = not available)
  polygon: string;    // Polygon symbol (empty = not available)
}

// Map our canonical symbols to each data source's format
function getTickerMapping(symbol: string): TickerMapping {
  // Commodity futures — only Yahoo Finance supports =F codes
  if (symbol.endsWith("=F")) {
    return { yahoo: symbol, finnhub: "", polygon: "" };
  }
  // Forex pairs — Yahoo uses =X, Polygon uses C: prefix
  if (symbol.endsWith("=X")) {
    const pair = symbol.replace("=X", "");
    // Finnhub forex needs OANDA: prefix — but free tier doesn't support forex candles
    return { yahoo: symbol, finnhub: "", polygon: `C:${pair}` };
  }
  // DX-Y.NYB (US Dollar Index) — Yahoo only
  if (symbol === "DX-Y.NYB") {
    return { yahoo: symbol, finnhub: "", polygon: "" };
  }
  // Regular stocks/ETFs — all three sources support them
  return { yahoo: symbol, finnhub: symbol, polygon: symbol };
}

// ============================================================
// Source 1: Yahoo Finance (via callDataApi)
// ============================================================
async function fetchFromYahoo(symbol: string, range: string = "5d"): Promise<QuoteResult | null> {
  try {
    const response = (await callDataApi("YahooFinance/get_stock_chart", {
      query: { symbol, interval: "1d", range },
    })) as YFChartResponse;

    if (!response?.chart?.result?.[0]) return null;

    const meta = response.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose;

    if (!price || price <= 0) return null;

    // Calculate change from meta
    let change = price - (prevClose || price);
    let changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // If meta gives 0 change, try to compute from actual bar data
    if (Math.abs(changePercent) < 0.001 && response.chart.result[0].indicators?.quote?.[0]) {
      const quotes = response.chart.result[0].indicators.quote[0];
      const closes = quotes.close.filter((c): c is number => c != null && c > 0);
      if (closes.length >= 2) {
        const lastClose = closes[closes.length - 1];
        const prevBarClose = closes[closes.length - 2];
        change = lastClose - prevBarClose;
        changePercent = prevBarClose > 0 ? (change / prevBarClose) * 100 : 0;
      }
    }

    return { price, change, changePercent, source: "yahoo" };
  } catch (e: any) {
    console.warn(`[Yahoo] Failed for ${symbol}: ${e.message || e}`);
    return null;
  }
}

// Timeout helper
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn(`[Timeout] ${label} timed out after ${ms}ms`);
        resolve(null);
      }, ms);
    }),
  ]);
}

// Get full chart data from Yahoo Finance (for historical bars)
async function fetchYFChart(
  symbol: string,
  interval: string = "1d",
  range: string = "5d"
): Promise<YFChartResult | null> {
  try {
    const response = await withTimeout(
      callDataApi("YahooFinance/get_stock_chart", {
        query: { symbol, interval, range },
      }) as Promise<YFChartResponse>,
      15000,
      `YFChart ${symbol} ${range}`
    );

    if (response?.chart?.result?.[0]) {
      return response.chart.result[0];
    }
    return null;
  } catch (e: any) {
    console.warn(`[Yahoo] Chart fetch failed for ${symbol}: ${e.message || e}`);
    return null;
  }
}

// ============================================================
// Source 2: Finnhub (direct HTTP — stocks/ETFs only)
// ============================================================
async function fetchFromFinnhub(symbol: string): Promise<QuoteResult | null> {
  const key = FINNHUB_KEY();
  if (!key) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    // Finnhub quote: c=current, d=change, dp=change%, pc=previous close, h=high, l=low, o=open
    const price = data.c;
    if (!price || price <= 0) return null;

    return {
      price,
      change: data.d || 0,
      changePercent: data.dp || 0,
      source: "finnhub",
    };
  } catch (e: any) {
    console.warn(`[Finnhub] Failed for ${symbol}: ${e.message || e}`);
    return null;
  }
}

// ============================================================
// Source 3: Polygon.io (direct HTTP — stocks/ETFs/forex)
// ============================================================
async function fetchFromPolygon(symbol: string): Promise<QuoteResult | null> {
  const key = POLYGON_KEY();
  if (!key) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?apiKey=${key}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) return null;

    const bar = data.results[0];
    const price = bar.c;
    if (!price || price <= 0) return null;

    const change = price - (bar.o || price);
    const changePercent = bar.o > 0 ? (change / bar.o) * 100 : 0;

    return { price, change, changePercent, source: "polygon" };
  } catch (e: any) {
    console.warn(`[Polygon] Failed for ${symbol}: ${e.message || e}`);
    return null;
  }
}

// ============================================================
// Concurrency limiter — prevents overwhelming any single API
// ============================================================
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number = 4
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from(
    { length: Math.min(maxConcurrent, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

// ============================================================
// Unified quote fetcher with triple-source fallback
// For stocks/ETFs: tries Finnhub first (faster direct HTTP), then Yahoo, then Polygon
// For futures/forex: tries Yahoo first (only source that supports them)
// ============================================================
async function fetchQuoteWithFallback(symbol: string): Promise<QuoteResult | null> {
  const cacheKey = `quote:${symbol}`;
  const cached = cache.get<QuoteResult>(cacheKey);
  if (cached) return cached;

  const mapping = getTickerMapping(symbol);

  // For stocks/ETFs: Finnhub is fastest (direct HTTP, includes change/dp)
  if (mapping.finnhub) {
    const finnhub = await fetchFromFinnhub(mapping.finnhub);
    if (finnhub && finnhub.price > 0) {
      cache.set(cacheKey, finnhub, CACHE_TTL.quote);
      return finnhub;
    }
  }

  // Yahoo Finance (supports all symbol types including futures and forex)
  const yahoo = await fetchFromYahoo(mapping.yahoo);
  if (yahoo && yahoo.price > 0) {
    cache.set(cacheKey, yahoo, CACHE_TTL.quote);
    return yahoo;
  }

  // Polygon.io last resort (stocks/ETFs/forex)
  if (mapping.polygon) {
    const polygon = await fetchFromPolygon(mapping.polygon);
    if (polygon && polygon.price > 0) {
      cache.set(cacheKey, polygon, CACHE_TTL.quote);
      return polygon;
    }
  }

  console.error(`[MarketData] All sources failed for ${symbol}`);
  return null;
}

// ============================================================
// Core ticker symbols for each asset class
// Uses Yahoo Finance symbols — commodities use futures codes for direct spot prices
// ============================================================
export const ASSET_TICKERS = {
  stocks: [
    { symbol: "SPY", name: "标普500 ETF", region: "us" as const },
    { symbol: "QQQ", name: "纳斯达克100 ETF", region: "us" as const },
    { symbol: "IWM", name: "罗素2000 ETF", region: "us" as const },
    { symbol: "ASHR", name: "沪深300 ETF", region: "asia" as const },
    { symbol: "CNXT", name: "创业板 ETF", region: "asia" as const },
    { symbol: "MCHI", name: "MSCI中国 ETF", region: "asia" as const },
    { symbol: "EWH", name: "恒生指数 ETF", region: "asia" as const },
    { symbol: "KWEB", name: "中概互联网 ETF", region: "asia" as const },
    { symbol: "KTEC", name: "恒生科技 ETF", region: "asia" as const },
    { symbol: "FXI", name: "中国大盘 ETF", region: "asia" as const },
    { symbol: "EFA", name: "发达市场 ETF", region: "europe" as const },
    { symbol: "EEM", name: "新兴市场 ETF", region: "emerging" as const },
    { symbol: "EWJ", name: "日本 ETF", region: "asia" as const },
    { symbol: "VGK", name: "欧洲 ETF", region: "europe" as const },
  ],
  bonds: [
    { symbol: "TLT", name: "20年+美国国债 ETF", region: "us" as const },
    { symbol: "IEF", name: "7-10年美国国债 ETF", region: "us" as const },
    { symbol: "SHY", name: "1-3年美国国债 ETF", region: "us" as const },
    { symbol: "TUA", name: "短期国债期货策略 ETF", region: "us" as const },
    { symbol: "TYA", name: "中期国债期货策略 ETF", region: "us" as const },
    { symbol: "CBON", name: "中国债券 ETF", region: "asia" as const },
    { symbol: "LQD", name: "投资级公司债 ETF", region: "us" as const },
    { symbol: "HYG", name: "高收益债 ETF", region: "us" as const },
    { symbol: "TIP", name: "通胀保值债券 ETF", region: "us" as const },
  ],
  commodities: [
    { symbol: "GC=F", name: "黄金", region: "us" as const },
    { symbol: "SI=F", name: "白银", region: "us" as const },
    { symbol: "CL=F", name: "WTI原油", region: "us" as const },
    { symbol: "NG=F", name: "天然气", region: "us" as const },
    { symbol: "DBA", name: "农产品 ETF", region: "us" as const },
    { symbol: "DBB", name: "基本金属 ETF", region: "us" as const },
  ],
  forex: [
    { symbol: "EURUSD=X", name: "欧元/美元", region: "europe" as const },
    { symbol: "JPY=X", name: "美元/日元", region: "asia" as const },
    { symbol: "GBPUSD=X", name: "英镑/美元", region: "europe" as const },
    { symbol: "CNH=X", name: "美元/离岸人民币", region: "asia" as const },
    { symbol: "AUDUSD=X", name: "澳元/美元", region: "asia" as const },
    { symbol: "DX-Y.NYB", name: "美元指数", region: "us" as const },
  ],
};

// ============================================================
// Public API Functions (same signatures as before)
// ============================================================

// Fetch previous day close for a ticker (with triple-source fallback)
export async function fetchPrevClose(
  ticker: string
): Promise<{ close: number; change: number; changePercent: number } | null> {
  const quote = await fetchQuoteWithFallback(ticker);
  if (!quote) return null;
  return { close: quote.price, change: quote.change, changePercent: quote.changePercent };
}

// Fetch aggregated bars for a ticker (returns Polygon-compatible format)
// Historical bars primarily use Yahoo Finance (best coverage for all symbol types)
export async function fetchAggs(
  ticker: string,
  multiplier: number,
  timespan: "day" | "week" | "month",
  from: string,
  to: string
): Promise<PolygonAgg[]> {
  const cacheKey = `aggs:${ticker}:${multiplier}:${timespan}:${from}:${to}`;
  const cached = cache.get<PolygonAgg[]>(cacheKey);
  if (cached) return cached;

  // Map timespan to Yahoo Finance interval
  const intervalMap: Record<string, string> = {
    day: "1d",
    week: "1wk",
    month: "1mo",
  };
  const interval = intervalMap[timespan] || "1d";

  // Calculate range from date difference
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const daysDiff = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let range: string;
  if (daysDiff <= 5) range = "5d";
  else if (daysDiff <= 30) range = "1mo";
  else if (daysDiff <= 90) range = "3mo";
  else if (daysDiff <= 180) range = "6mo";
  else if (daysDiff <= 365) range = "1y";
  else if (daysDiff <= 730) range = "2y";
  else range = "5y";

  // Try Yahoo Finance first (with timeout)
  const mapping = getTickerMapping(ticker);
  let chart = await fetchYFChart(mapping.yahoo, interval, range);

  // If Yahoo fails, try Polygon.io candles as fallback (works for stocks/ETFs/forex)
  if (!chart && mapping.polygon) {
    console.log(`[MarketData] Yahoo chart failed for ${ticker}, trying Polygon...`);
    const polygonBars = await fetchPolygonAggs(mapping.polygon, multiplier, timespan, from, to);
    if (polygonBars.length > 0) {
      cache.set(cacheKey, polygonBars, CACHE_TTL.aggs);
      return polygonBars;
    }
  }

  // If both fail for futures (=F symbols), try Yahoo with shorter range
  if (!chart && ticker.includes("=F")) {
    console.log(`[MarketData] Retrying Yahoo chart for ${ticker} with shorter range...`);
    const shorterRange = daysDiff <= 30 ? "1mo" : "3mo";
    chart = await fetchYFChart(mapping.yahoo, interval, shorterRange);
  }

  if (!chart || !chart.timestamp || !chart.indicators?.quote?.[0]) return [];

  const timestamps = chart.timestamp;
  const quote = chart.indicators.quote[0];

  // Convert to Polygon-compatible format
  const results: PolygonAgg[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open[i];
    const h = quote.high[i];
    const l = quote.low[i];
    const c = quote.close[i];
    const v = quote.volume[i];

    if (o != null && h != null && l != null && c != null) {
      results.push({
        o,
        h,
        l,
        c,
        v: v || 0,
        t: timestamps[i] * 1000, // Convert seconds to milliseconds
      });
    }
  }

  if (results.length > 0) {
    cache.set(cacheKey, results, CACHE_TTL.aggs);
  }
  return results;
}

// Polygon.io historical bars fallback
async function fetchPolygonAggs(
  symbol: string,
  multiplier: number,
  timespan: string,
  from: string,
  to: string
): Promise<PolygonAgg[]> {
  const key = POLYGON_KEY();
  if (!key) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${key}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "OK" || !data.results) return [];

    return data.results.map((r: any) => ({
      o: r.o,
      h: r.h,
      l: r.l,
      c: r.c,
      v: r.v || 0,
      t: r.t,
    }));
  } catch (e: any) {
    console.warn(`[Polygon] Aggs failed for ${symbol}: ${e.message || e}`);
    return [];
  }
}

// Get date strings for ranges
export function getDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// ============================================================
// Fetch asset class data (with parallel fetching + triple fallback)
// ============================================================
export async function fetchAssetClassData(
  assetClass: keyof typeof ASSET_TICKERS
) {
  const classCacheKey = `class:${assetClass}`;
  const cached = cache.get<any[]>(classCacheKey);
  if (cached) {
    console.log(`[MarketData] Cache hit for asset class ${assetClass}`);
    return cached;
  }

  const tickers = ASSET_TICKERS[assetClass];

  // Fetch with concurrency limit to avoid overwhelming APIs
  const tasks = tickers.map((t) => async () => {
    try {
      const quote = await fetchQuoteWithFallback(t.symbol);
      return {
        symbol: t.symbol,
        name: t.name,
        region: t.region,
        price: quote?.price || 0,
        change: quote?.change || 0,
        changePercent: quote?.changePercent || 0,
        source: quote?.source || "none",
      };
    } catch (e) {
      return {
        symbol: t.symbol,
        name: t.name,
        region: t.region,
        price: 0,
        change: 0,
        changePercent: 0,
        source: "none",
      };
    }
  });

  const results = await runWithConcurrency(tasks, 4);

  const hasData = results.some((r) => r.price > 0);
  if (hasData) {
    cache.set(classCacheKey, results, CACHE_TTL.assetClass);
  }

  // Log data source stats
  const sources = results.reduce((acc, r) => {
    acc[r.source] = (acc[r.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`[MarketData] ${assetClass}: ${JSON.stringify(sources)}`);

  return results;
}

// ============================================================
// Dashboard snapshot - key benchmarks for fast loading
// ============================================================
export async function fetchDashboardSnapshot(): Promise<
  Array<{
    symbol: string;
    name: string;
    assetClass: string;
    price: number;
    change: number;
    changePercent: number;
  }>
> {
  const cacheKey = "dashboard:snapshot";
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;

  const benchmarks = [
    { symbol: "SPY", name: "标普500", assetClass: "stocks" },
    { symbol: "ASHR", name: "沪深300", assetClass: "stocks" },
    { symbol: "EWH", name: "恒生指数", assetClass: "stocks" },
    { symbol: "TLT", name: "美国长期国债", assetClass: "bonds" },
    { symbol: "GC=F", name: "黄金", assetClass: "commodities" },
  ];

  // Fetch benchmarks with concurrency limit
  const tasks = benchmarks.map((b) => async () => {
    try {
      const quote = await fetchQuoteWithFallback(b.symbol);
      return {
        ...b,
        price: quote?.price || 0,
        change: quote?.change || 0,
        changePercent: quote?.changePercent || 0,
      };
    } catch (e) {
      return { ...b, price: 0, change: 0, changePercent: 0 };
    }
  });

  const results = await runWithConcurrency(tasks, 4);

  if (results.some((r) => r.price > 0)) {
    cache.set(cacheKey, results, 15 * 60 * 1000);
  }
  return results;
}

// Fetch historical data for SMA calculation
export async function fetchSMA200(ticker: string): Promise<number | null> {
  const cacheKey = `sma200:${ticker}`;
  const cached = cache.get<number>(cacheKey);
  if (cached) return cached;

  const { from, to } = getDateRange(365);
  const aggs = await fetchAggs(ticker, 1, "day", from, to);
  if (aggs.length < 200) return null;
  const last200 = aggs.slice(-200);
  const sum = last200.reduce((acc, a) => acc + a.c, 0);
  const sma = sum / 200;
  cache.set(cacheKey, sma, CACHE_TTL.sma);
  return sma;
}

// ============================================================
// Key tickers for comprehensive market data summary
// ============================================================
const SUMMARY_TICKERS = [
  // Stocks - global coverage
  { symbol: "SPY", name: "标普500 ETF", assetClass: "stocks", note: "美股基准" },
  { symbol: "QQQ", name: "纳斯达克100 ETF", assetClass: "stocks", note: "美国科技股" },
  { symbol: "ASHR", name: "沪深300 ETF", assetClass: "stocks", note: "中国A股基准" },
  { symbol: "EWH", name: "恒生指数 ETF", assetClass: "stocks", note: "港股基准" },
  { symbol: "KWEB", name: "中概互联网 ETF", assetClass: "stocks", note: "中国科技股" },
  { symbol: "EEM", name: "新兴市场 ETF", assetClass: "stocks", note: "新兴市场基准" },
  // Bonds
  { symbol: "TLT", name: "20年+美国国债 ETF", assetClass: "bonds", note: "美国长期国债" },
  { symbol: "IEF", name: "7-10年美国国债 ETF", assetClass: "bonds", note: "美国中期国债" },
  { symbol: "HYG", name: "高收益债 ETF", assetClass: "bonds", note: "信用利差指标" },
  // Commodities — direct futures prices
  { symbol: "GC=F", name: "黄金", assetClass: "commodities", note: "COMEX黄金期货，美元/盎司" },
  { symbol: "SI=F", name: "白银", assetClass: "commodities", note: "COMEX白银期货，美元/盎司" },
  { symbol: "CL=F", name: "WTI原油", assetClass: "commodities", note: "NYMEX原油期货，美元/桶" },
  // Forex — direct currency pairs
  { symbol: "EURUSD=X", name: "欧元/美元", assetClass: "forex", note: "" },
  { symbol: "JPY=X", name: "美元/日元", assetClass: "forex", note: "" },
  { symbol: "CNH=X", name: "美元/离岸人民币", assetClass: "forex", note: "" },
  { symbol: "DX-Y.NYB", name: "美元指数", assetClass: "forex", note: "美元强弱指标" },
];

// Build comprehensive market data summary for LLM analysis
export async function buildMarketDataSummary(): Promise<string> {
  const cacheKey = "macro:summary";
  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  const lines: string[] = [
    `## 全球市场数据快照（实时）`,
    `数据时间: ${new Date().toISOString().split("T")[0]}`,
    `数据来源: Yahoo Finance / Finnhub / Polygon.io（三源容错，实时市场价格）`,
    ``,
    `说明: 商品价格为期货合约直接报价（非ETF换算），外汇为即期汇率。`,
    ``,
  ];

  let lastClass = "";

  // Fetch summary tickers with concurrency limit
  const summaryTasks = SUMMARY_TICKERS.map((ticker) => async () => {
    try {
      const quote = await fetchQuoteWithFallback(ticker.symbol);
      return { ticker, quote };
    } catch (e) {
      return { ticker, quote: null as QuoteResult | null };
    }
  });

  const fetchResults = await runWithConcurrency(summaryTasks, 4);

  for (const { ticker, quote } of fetchResults) {
    if (ticker.assetClass !== lastClass) {
      const classLabels: Record<string, string> = {
        stocks: "股票市场",
        bonds: "债券市场",
        commodities: "商品市场",
        forex: "外汇市场",
      };
      lines.push(
        `### ${classLabels[ticker.assetClass] || ticker.assetClass}`
      );
      lastClass = ticker.assetClass;
    }

    if (quote && quote.price > 0) {
      const dir =
        quote.changePercent > 0 ? "↑" : quote.changePercent < 0 ? "↓" : "→";
      let line = `- ${ticker.name} (${ticker.symbol}): $${quote.price.toFixed(2)} ${dir} ${quote.changePercent.toFixed(2)}%`;
      if (ticker.note) {
        line += ` [${ticker.note}]`;
      }
      line += ` (${quote.source})`;
      lines.push(line);
    } else {
      lines.push(`- ${ticker.name} (${ticker.symbol}): 数据暂不可用`);
    }
  }

  const result = lines.join("\n");
  if (result.includes("$")) {
    cache.set(cacheKey, result, CACHE_TTL.macroSummary);
  }
  return result;
}

// ============================================================
// Build quarterly (90-day) market performance summary for macro scenario analysis
// This provides longer-term context so LLM judges macro scenarios based on
// quarterly trends rather than daily noise.
// ============================================================
export async function buildQuarterlyMarketSummary(): Promise<string> {
  const cacheKey = "macro:quarterly-summary";
  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  const { from, to } = getDateRange(90);

  const lines: string[] = [
    `## 过去一个季度（90天）大类资产价格表现`,
    `统计区间: ${from} 至 ${to}`,
    `数据来源: Yahoo Finance / Polygon.io（历史K线数据）`,
    ``,
    `说明: 以下数据展示各大类资产过去90天的价格变动趋势，用于判断中长期宏观情景。`,
    `宏观情景判断应基于季度级别的趋势，而非每日短期波动。`,
    ``,
  ];

  // Fetch 90-day historical bars for each summary ticker
  const quarterlyTasks = SUMMARY_TICKERS.map((ticker) => async () => {
    try {
      const aggs = await fetchAggs(ticker.symbol, 1, "day", from, to);
      return { ticker, aggs };
    } catch (e) {
      return { ticker, aggs: [] as PolygonAgg[] };
    }
  });

  const quarterlyResults = await runWithConcurrency(quarterlyTasks, 3);

  let lastClass = "";
  for (const { ticker, aggs } of quarterlyResults) {
    if (ticker.assetClass !== lastClass) {
      const classLabels: Record<string, string> = {
        stocks: "股票市场",
        bonds: "债券市场",
        commodities: "商品市场",
        forex: "外汇市场",
      };
      lines.push(`### ${classLabels[ticker.assetClass] || ticker.assetClass}`);
      lastClass = ticker.assetClass;
    }

    if (aggs.length >= 5) {
      const firstClose = aggs[0].c;
      const lastClose = aggs[aggs.length - 1].c;
      const quarterChange = ((lastClose - firstClose) / firstClose) * 100;
      const high = Math.max(...aggs.map((a) => a.h));
      const low = Math.min(...aggs.map((a) => a.l));

      // Determine quarterly trend
      // Use 30-day midpoint vs endpoints to assess trend direction
      const midIdx = Math.floor(aggs.length / 2);
      const midClose = aggs[midIdx].c;
      const firstThirdAvg = aggs.slice(0, Math.floor(aggs.length / 3)).reduce((s, a) => s + a.c, 0) / Math.floor(aggs.length / 3);
      const lastThirdAvg = aggs.slice(-Math.floor(aggs.length / 3)).reduce((s, a) => s + a.c, 0) / Math.floor(aggs.length / 3);
      const trendPct = ((lastThirdAvg - firstThirdAvg) / firstThirdAvg) * 100;

      let trend = "→ 横盘震荡";
      if (trendPct > 3) trend = "↑ 上升趋势";
      else if (trendPct > 1) trend = "↗ 温和上涨";
      else if (trendPct < -3) trend = "↓ 下降趋势";
      else if (trendPct < -1) trend = "↘ 温和下跌";

      // Volatility (standard deviation of daily returns)
      const dailyReturns: number[] = [];
      for (let i = 1; i < aggs.length; i++) {
        if (aggs[i - 1].c > 0) {
          dailyReturns.push((aggs[i].c - aggs[i - 1].c) / aggs[i - 1].c);
        }
      }
      const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / dailyReturns.length;
      const annualizedVol = (Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(1);

      const dir = quarterChange > 0 ? "↑" : quarterChange < 0 ? "↓" : "→";
      lines.push(
        `- ${ticker.name} (${ticker.symbol}): 季度起始$${firstClose.toFixed(2)} → 当前$${lastClose.toFixed(2)} | ` +
        `季度涨跌${dir}${quarterChange.toFixed(2)}% | 季度高$${high.toFixed(2)} 低$${low.toFixed(2)} | ` +
        `趋势: ${trend} | 年化波动率: ${annualizedVol}%`
      );
      if (ticker.note) {
        lines[lines.length - 1] += ` [${ticker.note}]`;
      }
    } else {
      lines.push(`- ${ticker.name} (${ticker.symbol}): 季度历史数据不足`);
    }
  }

  const result = lines.join("\n");
  // Cache for 4 hours — quarterly trends don't change rapidly
  cache.set(cacheKey, result, 4 * 60 * 60 * 1000);
  return result;
}
