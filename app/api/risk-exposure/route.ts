import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Beta 7.0 战略配置权重 (用于计算偏离度) - 百分比格式
const TARGET_WEIGHTS: Record<string, number> = {
  "US Equity": 50,    // 50%
  "CN Equity": 15,
  "US Bond": 20,
  "CN Bond": 5,
  "Commodity": 5,
  "Gold": 5,
};

// Beta 7.0 风险平价目标 (风险贡献百分比)
const TARGET_RISK_CONTRIBUTION: Record<string, number> = {
  "US Equity": 50,    // 50%
  "CN Equity": 15,
  "US Bond": 20,
  "CN Bond": 5,
  "Commodity": 5,
  "Gold": 5,
};

// 持仓映射到6大风险单元
const ASSET_MAPPING: Record<string, string> = {
  // 美股集群 (支持中文名和简化ticker)
  "纳斯达克100期货小型": "US Equity",
  "道琼斯工业平均": "US Equity",
  "日经225": "US Equity",
  "韩国Kospi200": "US Equity",
  "印度NIFTY50": "US Equity",
  "iShares MSCI巴西ETF": "US Equity",
  "NDX": "US Equity",
  "SPX": "US Equity",
  "NASDAQ": "US Equity",
  "DJI": "US Equity",
  "SPY": "US Equity",
  "QQQ": "US Equity",
  // 中股集群
  "沪深300期货": "CN Equity",
  "中证500期货": "CN Equity",
  "中国海洋石油": "CN Equity",
  "HS300": "CN Equity",
  "ZZ500": "CN Equity",
  "ASHR": "CN Equity",
  // 美债集群
  "CBOT10年美债": "US Bond",
  "CBOT长期美债": "US Bond",
  "10年期日本国债期货": "US Bond",
  "US10Y_Bond": "US Bond",
  "TLT": "US Bond",
  "IEF": "US Bond",
  // 中债集群
  "CFFEX10年期国债期货（中国10Y国债期货）": "CN Bond",
  "CFFEX30年期国债期货（中国30Y国债期货）": "CN Bond",
  "CN10Y_Bond": "CN Bond",
  // 黄金
  "SHFE黄金": "Gold",
  "Gold": "Gold",
  "GLD": "Gold",
  "GC=F": "Gold",
  // 商品集群
  "SHFE铜": "Commodity",
  "SHFE白银": "Commodity",
  "SHFE锡": "Commodity",
  "SHFE镍": "Commodity",
  "SHFE铝": "Commodity",
  "SHFE橡胶": "Commodity",
  "DCE棕榈油": "Commodity",
  "CZCE棉花": "Commodity",
  "DCE豆油": "Commodity",
  "DCE豆粕": "Commodity",
  "CZCE PTA": "Commodity",
  "CZCE甲醇": "Commodity",
  "CZCE纯碱": "Commodity",
  "DCE焦煤": "Commodity",
  "GFEX碳酸锂": "Commodity",
  "GFEX多晶硅": "Commodity",
  "DCE PVC": "Commodity",
  "Nanhua": "Commodity",
  "CL=F": "Commodity", // 原油
};

// 经验波动率 (用于风险贡献计算)
const VOL_ASSUMPTION: Record<string, number> = {
  "US Equity": 0.15,
  "CN Equity": 0.18,
  "US Bond": 0.05,
  "CN Bond": 0.04,
  "Commodity": 0.20,
  "Gold": 0.12,
};

// Ledoit-Wolf 相关性矩阵 (2026-03 最新)
const CORRELATION_MATRIX: number[][] = [
  // US_EQUITY, CN_EQUITY, US_BOND, CN_BOND, COMMODITY, GOLD
  [1.00, 0.52, -0.15, -0.08, 0.25, 0.08],   // US_EQUITY
  [0.52, 1.00, -0.12, 0.15, 0.30, 0.12],   // CN_EQUITY
  [-0.15, -0.12, 1.00, 0.65, -0.20, 0.35], // US_BOND
  [-0.08, 0.15, 0.65, 1.00, -0.10, 0.28],  // CN_BOND
  [0.25, 0.30, -0.20, -0.10, 1.00, 0.42],  // COMMODITY
  [0.08, 0.12, 0.35, 0.28, 0.42, 1.00],    // GOLD
];

const ASSET_ORDER = ["US Equity", "CN Equity", "US Bond", "CN Bond", "Commodity", "Gold"];

// 获取持仓数据 (从 LIVE_SIM_MONITOR.json)
function getPositions(): Array<{ name: string; weight: number }> {
  try {
    const filePath = path.join(process.cwd(), "..", "LIVE_SIM_MONITOR.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    
    if (data.holdings) {
      return Object.entries(data.holdings).map(([name, info]) => ({
        name,
        weight: (info as { notional_weight?: number }).notional_weight || 0,
      }));
    }
    return [];
  } catch (e) {
    console.error("[RiskExposure] Failed to read holdings:", e);
    return [];
  }
}

// 获取 NAV 数据 (用于计算交易金额)
function getNavValue(): number {
  try {
    const navFilePath = path.join(process.cwd(), "data", "nav", "beta70", "latest.json");
    const raw = fs.readFileSync(navFilePath, "utf-8");
    const data = JSON.parse(raw);
    
    if (data.nav && data.nav.length > 0) {
      const latest = data.nav[data.nav.length - 1];
      return latest.value * 10000; // 还原为实际NAV
    }
    return 1000000;
  } catch {
    return 1000000;
  }
}

// 计算风险暴露 (使用权重 + 风险贡献双模式)
function computeRiskExposure(positions: Array<{ name: string; weight: number }>) {
  if (!positions || positions.length === 0) {
    return null;
  }
  
  // 1. 计算名义权重 (保持原始权重，不归一化)
  const weightByRiskUnit: Record<string, number> = {
    "US Equity": 0,
    "CN Equity": 0,
    "US Bond": 0,
    "CN Bond": 0,
    "Commodity": 0,
    "Gold": 0,
  };
  
  // 2. 计算风险贡献 (权重 × 波动率)
  const riskContribByUnit: Record<string, number> = {
    "US Equity": 0,
    "CN Equity": 0,
    "US Bond": 0,
    "CN Bond": 0,
    "Commodity": 0,
    "Gold": 0,
  };
  
  for (const pos of positions) {
    const category = ASSET_MAPPING[pos.name] || "Commodity";
    const vol = VOL_ASSUMPTION[category] || 0.15;
    
    if (category in weightByRiskUnit) {
      weightByRiskUnit[category] += pos.weight;
      riskContribByUnit[category] += Math.abs(pos.weight) * vol;
    }
  }
  
  // 归一化风险贡献为百分比
  const totalRiskContrib = Object.values(riskContribByUnit).reduce((a, b) => a + b, 0);
  
  // 构建结果
  const result = Object.keys(weightByRiskUnit).map(assetClass => {
    const rawWeight = weightByRiskUnit[assetClass];
    const targetWeightPct = TARGET_WEIGHTS[assetClass] || 0;
    
    // 权重偏离度: 原始权重 vs 目标权重(百分比)
    // 假设总权重约为1，则偏离度 = 原始权重*100 - 目标百分比
    const weightDeviation = (rawWeight * 100) - targetWeightPct;
    
    // 风险贡献百分比
    const riskContribPct = totalRiskContrib > 0 
      ? (riskContribByUnit[assetClass] / totalRiskContrib) * 100 
      : 0;
    const targetRisk = TARGET_RISK_CONTRIBUTION[assetClass] || 0;
    const riskDeviation = riskContribPct - targetRisk;
    
    return {
      assetClass,
      label: getAssetLabel(assetClass),
      // 权重相关
      weight: Math.round(rawWeight * 100 * 10) / 10,  // 转换为百分比
      targetWeight: targetWeightPct,
      weightDeviation: Math.round(weightDeviation * 10) / 10,
      // 风险贡献相关
      riskContribution: Math.round(riskContribPct * 10) / 10,
      targetRiskContribution: targetRisk,
      riskDeviation: Math.round(riskDeviation * 10) / 10,
      // 综合偏离度 (使用权重偏离度，用于再平衡)
      deviation: Math.round(weightDeviation * 10) / 10,
      source: "truth" as const,
      methodology: "Dual-mode: weight deviation + risk contribution from LIVE_SIM_MONITOR.json",
    };
  });
  
  return result;
}

function getAssetLabel(assetClass: string): string {
  const labels: Record<string, string> = {
    "US Equity": "美股",
    "CN Equity": "中股",
    "US Bond": "美债",
    "CN Bond": "中债",
    "Commodity": "商品",
    "Gold": "黄金",
  };
  return labels[assetClass] || assetClass;
}

// 生成再平衡建议
function generateRebalanceSuggestions(
  riskExposure: ReturnType<typeof computeRiskExposure>,
  navValue: number
) {
  if (!riskExposure) return [];
  
  const REBALANCE_THRESHOLD = 3; // 偏离超过 3%
  const MIN_TRADE_AMOUNT = 5000; // 最小交易金额
  
  return riskExposure
    .filter(r => Math.abs(r.deviation) > REBALANCE_THRESHOLD)
    .map(r => {
      const tradeAmount = Math.abs(r.deviation / 100) * navValue;
      if (tradeAmount < MIN_TRADE_AMOUNT) return null;
      
      const deviationAbs = Math.abs(r.deviation);
      let reason = "";
      let confidence: "high" | "medium" | "low" = "medium";
      
      if (r.deviation > 0) {
        if (deviationAbs > 5) {
          reason = "显著超配，建议减持";
          confidence = "high";
        } else {
          reason = "轻微超配，可考虑减持";
          confidence = "medium";
        }
      } else {
        if (deviationAbs > 5) {
          reason = "显著低配，建议增持";
          confidence = "high";
        } else {
          reason = "轻微低配，可考虑增持";
          confidence = "medium";
        }
      }
      
      return {
        assetClass: r.assetClass,
        label: r.label,
        action: r.deviation > 0 ? "sell" as const : "buy" as const,
        currentWeight: r.weight,
        targetWeight: r.targetWeight,
        deviation: r.deviation,
        amount: Math.round(tradeAmount),
        reason,
        confidence,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b!.deviation) - Math.abs(a!.deviation));
}

export async function GET() {
  try {
    // 获取真实持仓
    const positions = getPositions();
    const lastUpdated = positions.length > 0 
      ? new Date().toISOString() 
      : "2026-03-04T02:00:27Z";
    
    // 计算风险暴露
    const riskExposureData = computeRiskExposure(positions);
    
    // 获取 NAV 值
    const navValue = getNavValue();
    
    // 生成再平衡建议
    const rebalanceSuggestions = generateRebalanceSuggestions(riskExposureData, navValue);
    
    if (!riskExposureData || riskExposureData.length === 0) {
      // 降级：使用占位数据
      const fallback = Object.entries(TARGET_WEIGHTS).map(([assetClass, target]) => ({
        assetClass,
        label: getAssetLabel(assetClass),
        weight: target,
        targetWeight: target,
        weightDeviation: 0,
        riskContribution: target,
        targetRiskContribution: target,
        riskDeviation: 0,
        deviation: 0,
        source: "placeholder" as const,
        methodology: "Fallback: using target allocation",
      }));
      
      return NextResponse.json({
        success: true,
        data: fallback,
        lastUpdated,
        note: "Using target allocation (placeholder)",
        rebalance: [],
      });
    }

    return NextResponse.json({
      success: true,
      data: riskExposureData,
      lastUpdated,
      note: "Risk exposure from LIVE_SIM_MONITOR.json. Source: truth (validated by Data-Nexus)",
      rebalance: rebalanceSuggestions,
      correlationMatrix: {
        assets: ASSET_ORDER,
        matrix: CORRELATION_MATRIX,
        methodology: "Ledoit-Wolf shrinkage (2026-03)",
        source: "indicative",
      },
      metadata: {
        positionCount: positions.length,
        navValue,
        targetVolatility: 0.10,
      },
    });
  } catch (e) {
    console.error("[RiskExposure] Error:", e);
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
