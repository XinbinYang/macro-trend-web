/**
 * 中国债券数据统一适配器 (稳态重建方案)
 * 
 * 设计原则:
 * 1. 非破坏性: 保持原有接口兼容
 * 2. 渐进式: 先落地基础设施，再替换数据源
 * 3. 可降级: 4级降级链确保稳定
 * 
 * 数据层级:
 * - L1 展示层: 实时/日度行情 (Eastmoney/AkShare)
 * - L2 分析层: 收益率曲线、技术指标 (AkShare)
 * - L3 真值层: 结算价、总财富指数 (Master Parquet)
 */

import { promises as fs } from "fs";
import path from "path";

// ============================================================================
// 类型定义
// ============================================================================

export type CnBondSymbol = "TS" | "TF" | "T" | "TL";  // 2Y/5Y/10Y/30Y
export type CnBondMaturity = "2Y" | "5Y" | "10Y" | "30Y";
export type DataLevel = "L1" | "L2" | "L3";
export type DataStatus = "LIVE" | "DELAYED" | "STALE" | "OFF";

export interface BondFutureQuote {
  symbol: string;           // "T2506", "TF2506", "TL2506"
  name: string;             // "10年期国债期货"
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  openInterest?: number;
  timestamp: string;
  source: string;
  dataType: "REALTIME" | "EOD";
  status: DataStatus;
}

export interface CnYieldCurve {
  date: string;
  maturities: Record<CnBondMaturity, number>;
  source: string;
  status: DataStatus;
}

export interface CnBondDataResponse {
  futures: BondFutureQuote[];
  yieldCurve: CnYieldCurve | null;
  timestamp: string;
  source: string;
  status: DataStatus;
  errors?: string[];
}

export interface BondDataConfig {
  level?: DataLevel;
  realtime?: boolean;
  fallback?: boolean;
}

// ============================================================================
// 常量配置
// ============================================================================

const BOND_FUTURE_CONFIG: Record<CnBondSymbol, { name: string; maturity: CnBondMaturity; emCode: string }> = {
  TS: { name: "2年期国债期货", maturity: "2Y", emCode: "1.8888" },  // 需确认实际code
  TF: { name: "5年期国债期货", maturity: "5Y", emCode: "1.8889" },
  T:  { name: "10年期国债期货", maturity: "10Y", emCode: "1.8890" },
  TL: { name: "30年期国债期货", maturity: "30Y", emCode: "1.8891" },
};

const DATA_DIR = path.join(process.cwd(), "data", "bond-cn");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _CACHE_TTL = {
  REALTIME: 30 * 1000,      // 30s
  EOD: 5 * 60 * 1000,       // 5min
  YIELD: 60 * 60 * 1000,    // 1h
};

// ============================================================================
// 主入口函数
// ============================================================================

/**
 * 获取中国债券数据 (统一入口)
 */
export async function getCnBondData(
  config: BondDataConfig = {}
): Promise<CnBondDataResponse> {
  const { level = "L1", realtime = false, fallback = true } = config;
  
  try {
    switch (level) {
      case "L3":
        return await getTruthLayerData();
      case "L2":
        return await getAnalysisLayerData(fallback);
      case "L1":
      default:
        return await getDisplayLayerData(realtime, fallback);
    }
  } catch (error) {
    console.error("[CnBond] Failed to get data:", error);
    
    if (fallback) {
      return await getFallbackData();
    }
    
    return {
      futures: [],
      yieldCurve: null,
      timestamp: new Date().toISOString(),
      source: "OFF",
      status: "OFF",
      errors: [(error as Error).message],
    };
  }
}

// ============================================================================
// L1: 展示层
// ============================================================================

async function getDisplayLayerData(
  realtime: boolean,
  fallback: boolean
): Promise<CnBondDataResponse> {
  const errors: string[] = [];
  
  // 1. 尝试 Eastmoney (免key，优先)
  try {
    const emData = await fetchFromEastmoney();
    if (emData && validateFuturesData(emData)) {
      const yieldCurve = await fetchYieldCurveFromCache();
      return {
        futures: emData,
        yieldCurve,
        timestamp: new Date().toISOString(),
        source: "Eastmoney",
        status: realtime ? "LIVE" : "DELAYED",
      };
    }
  } catch (e) {
    errors.push(`Eastmoney: ${(e as Error).message}`);
  }
  
  // 2. 降级到 AkShare
  if (fallback) {
    try {
      const akData = await fetchFromAkShareEOD();
      if (akData && validateFuturesData(akData)) {
        const yieldCurve = await fetchYieldCurveFromCache();
        return {
          futures: akData,
          yieldCurve,
          timestamp: new Date().toISOString(),
          source: "AkShare",
          status: "DELAYED",
        };
      }
    } catch (e) {
      errors.push(`AkShare: ${(e as Error).message}`);
    }
  }
  
  // 3. 最终降级: 本地缓存/seed
  return await getFallbackData(errors);
}

/**
 * 从 Eastmoney 获取国债期货实时行情
 * 
 * Eastmoney API 格式:
 * - 期货代码格式: 1.XXXXX (上期所)
 * - 接口: https://push2.eastmoney.com/api/qt/stock/get
 */
async function fetchFromEastmoney(): Promise<BondFutureQuote[] | null> {
  const results: BondFutureQuote[] = [];
  
  for (const [symbol, config] of Object.entries(BOND_FUTURE_CONFIG)) {
    try {
      const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${config.emCode}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170`;
      
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://quote.eastmoney.com/",
        },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!res.ok) continue;
      
      const data = await res.json();
      if (!data.data) continue;
      
      const q = data.data;
      results.push({
        symbol: q.f57 || `${symbol}2506`,  // 使用主力合约代码
        name: config.name,
        price: q.f43 / 100,
        change: q.f169 / 100,
        changePercent: q.f170 / 100,
        volume: q.f47 || 0,
        timestamp: new Date().toISOString(),
        source: "Eastmoney",
        dataType: "REALTIME",
        status: "LIVE",
      });
    } catch (e) {
      console.warn(`[Eastmoney] ${symbol} failed:`, e);
    }
  }
  
  return results.length > 0 ? results : null;
}

/**
 * 从 AkShare 获取日度数据
 * 
 * 注意: AkShare 是 Python 库，这里通过本地文件或 HTTP 服务获取
 */
async function fetchFromAkShareEOD(): Promise<BondFutureQuote[] | null> {
  // 尝试读取本地缓存的最新数据
  try {
    const cachePath = path.join(DATA_DIR, "latest.json");
    const data = await fs.readFile(cachePath, "utf-8");
    const parsed = JSON.parse(data);
    
    if (parsed.futures && Array.isArray(parsed.futures)) {
      return parsed.futures.map((f: BondFutureQuote) => ({
        ...f,
        dataType: "EOD" as const,
        status: "DELAYED" as const,
      }));
    }
  } catch {
    // 缓存不存在或损坏
  }
  
  return null;
}

// ============================================================================
// L2: 分析层
// ============================================================================

async function getAnalysisLayerData(
  fallback: boolean
): Promise<CnBondDataResponse> {
  // L2 包含 L1 的所有数据 + 收益率曲线
  const baseData = await getDisplayLayerData(false, fallback);
  
  // 尝试获取最新收益率曲线
  const yieldCurve = await fetchYieldCurveFromAkShare();
  if (yieldCurve) {
    baseData.yieldCurve = yieldCurve;
  }
  
  return baseData;
}

async function fetchYieldCurveFromAkShare(): Promise<CnYieldCurve | null> {
  // 从本地缓存或 API 获取
  try {
    const cachePath = path.join(DATA_DIR, "yield-curve", "latest.json");
    const data = await fs.readFile(cachePath, "utf-8");
    const parsed = JSON.parse(data);
    
    return {
      date: parsed.date,
      maturities: parsed.maturities,
      source: "AkShare",
      status: "LIVE",
    };
  } catch {
    return null;
  }
}

async function fetchYieldCurveFromCache(): Promise<CnYieldCurve | null> {
  // 优先使用缓存，避免频繁读取文件
  return await fetchYieldCurveFromAkShare();
}

// ============================================================================
// L3: 真值层
// ============================================================================

async function getTruthLayerData(): Promise<CnBondDataResponse> {
  // L3 数据来自 Master Parquet，仅用于回测
  // 这里返回空数据，实际实现需要对接 Master 数据管道
  
  return {
    futures: [],
    yieldCurve: null,
    timestamp: new Date().toISOString(),
    source: "Master",
    status: "OFF",
    errors: ["L3 truth layer not yet implemented"],
  };
}

// ============================================================================
// 降级策略
// ============================================================================

async function getFallbackData(errors: string[] = []): Promise<CnBondDataResponse> {
  // 1. 尝试读取本地归档数据
  try {
    const archiveDir = path.join(DATA_DIR, "archive");
    const files = await fs.readdir(archiveDir);
    const latestFile = files
      .filter(f => f.endsWith(".json"))
      .sort()
      .pop();
    
    if (latestFile) {
      const data = await fs.readFile(path.join(archiveDir, latestFile), "utf-8");
      const parsed = JSON.parse(data);
      
      return {
        futures: parsed.futures || [],
        yieldCurve: parsed.yieldCurve || null,
        timestamp: new Date().toISOString(),
        source: "Archive",
        status: "STALE",
        errors,
      };
    }
  } catch {
    // 归档读取失败
  }
  
  // 2. 最终降级: seed 数据
  return getSeedData(errors);
}

function getSeedData(errors: string[] = []): CnBondDataResponse {
  // 预置的 seed 数据，确保构建和展示不崩溃
  const seedFutures: BondFutureQuote[] = [
    {
      symbol: "TS2506",
      name: "2年期国债期货",
      price: 102.85,
      change: 0.03,
      changePercent: 0.03,
      volume: 45600,
      timestamp: new Date().toISOString(),
      source: "Seed",
      dataType: "EOD",
      status: "OFF",
    },
    {
      symbol: "TF2506",
      name: "5年期国债期货",
      price: 106.18,
      change: 0.08,
      changePercent: 0.08,
      volume: 89200,
      timestamp: new Date().toISOString(),
      source: "Seed",
      dataType: "EOD",
      status: "OFF",
    },
    {
      symbol: "T2506",
      name: "10年期国债期货",
      price: 108.25,
      change: 0.15,
      changePercent: 0.14,
      volume: 125800,
      timestamp: new Date().toISOString(),
      source: "Seed",
      dataType: "EOD",
      status: "OFF",
    },
    {
      symbol: "TL2506",
      name: "30年期国债期货",
      price: 112.45,
      change: 0.22,
      changePercent: 0.20,
      volume: 67800,
      timestamp: new Date().toISOString(),
      source: "Seed",
      dataType: "EOD",
      status: "OFF",
    },
  ];
  
  return {
    futures: seedFutures,
    yieldCurve: null,
    timestamp: new Date().toISOString(),
    source: "Seed",
    status: "OFF",
    errors: [...errors, "Using seed data (all sources failed)"],
  };
}

// ============================================================================
// 工具函数
// ============================================================================

function validateFuturesData(data: BondFutureQuote[]): boolean {
  if (!Array.isArray(data) || data.length === 0) return false;
  
  // 检查数据合理性
  for (const item of data) {
    if (!item.symbol || typeof item.price !== "number") return false;
    if (item.price <= 0 || item.price > 200) return false;  // 国债期货合理价格范围
    if (Math.abs(item.changePercent) > 10) return false;    // 单日涨跌幅不超过10%
  }
  
  return true;
}

// ============================================================================
// 兼容层: 保持原有接口
// ============================================================================

/**
 * 获取国债期货主力合约数据 (兼容旧接口)
 * @deprecated 使用 getCnBondData 替代
 */
export async function getChinaBondFutures(): Promise<BondFutureQuote[]> {
  const data = await getCnBondData({ level: "L1", realtime: true, fallback: true });
  return data.futures;
}

/**
 * 获取国债收益率曲线 (兼容旧接口)
 * @deprecated 使用 getCnBondData 替代
 */
export async function getChinaBondYieldCurve(): Promise<{
  maturity: string;
  yield: number;
  change: number;
}[]> {
  const data = await getCnBondData({ level: "L2", fallback: true });
  
  if (!data.yieldCurve) {
    return [
      { maturity: "1Y", yield: 1.85, change: -0.02 },
      { maturity: "2Y", yield: 1.95, change: -0.03 },
      { maturity: "5Y", yield: 2.15, change: -0.04 },
      { maturity: "10Y", yield: 2.35, change: -0.05 },
      { maturity: "30Y", yield: 2.65, change: -0.06 },
    ];
  }
  
  return Object.entries(data.yieldCurve.maturities).map(([maturity, yield_]) => ({
    maturity,
    yield: yield_,
    change: 0,  // 需要历史数据计算
  }));
}
