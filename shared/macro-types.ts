// ============================================================
// MacroTrend Trader - Shared Type Definitions
// ============================================================

// --- Macro Environment ---

export type MacroScenario = "inflation" | "deflation" | "goldilocks" | "stagflation";

export type TrendDirection = "bullish" | "bearish" | "neutral";

export type SignalStrength = "strong" | "moderate" | "weak";

export type ValuationBias = "overvalued" | "undervalued" | "fair";

export type AssetClass = "cn_stocks" | "cn_bonds" | "us_stocks" | "us_bonds" | "gold" | "other_markets";

export type TimeFrame = "weekly" | "quarterly";

export type RiskProfile = "conservative" | "balanced" | "aggressive";

// "AI宏观作手"统一投资风格的五大分析维度
export type AnalysisDimension =
  | "cycle"       // 周期分析：债务周期、经济周期、跨资产相关性
  | "reflexivity" // 反身性分析：市场偏见与现实的脱节、预期差
  | "liquidity"   // 流动性分析：央行政策、M2增速、资金流向
  | "technical"   // 技术趋势：关键点位、200日均线、不对称风报比
  | "integrated"; // 综合视角：融合以上四大维度

export type MarketRegion = "us" | "europe" | "asia" | "emerging";

// --- Macro Dashboard ---

export interface MacroEnvironment {
  scenario: MacroScenario;
  scenarioLabel: string;
  scenarioDescription: string;
  confidence: number;
  liquidityTrend: TrendDirection;
  liquidityDescription: string;
  growthOutlook: TrendDirection;
  inflationOutlook: TrendDirection;
  policyStance: string;
  lastUpdated: string;
}

export interface AssetClassSignal {
  assetClass: AssetClass;
  label: string;
  direction: TrendDirection;
  strength: SignalStrength;
  summary: string;
  keyDrivers: string[];
  topPicks: string[];
}

export interface TradeIdea {
  id: string;
  title: string;
  asset: string;
  assetClass: AssetClass;
  direction: TrendDirection;
  confidence: SignalStrength;
  riskRewardRatio: string;
  entryRange: string;
  stopLoss: string;
  target: string;
  thesis: string;
  analysisBasis: AnalysisDimension; // 该交易建议基于哪个分析维度
  timeFrame: string;
  createdAt: string;
}

// --- Asset Analysis ---

export interface AssetItem {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  price: number;
  change: number;
  changePercent: number;
  direction: TrendDirection;
  valuation: ValuationBias;
  signalStrength: SignalStrength;
  region: MarketRegion;
}

export interface AssetDetail extends AssetItem {
  description: string;
  ma200: number;
  priceVsMa200: number;
  keySupport: string;
  keyResistance: string;
  pivotalPoints: string[];
  macroDrivers: string[];
  crossAssetCorrelations: CrossAssetCorrelation[];
  tradeStrategy: TradeStrategy;
  dimensionViews: DimensionView[]; // 多维度分析视角
}

export interface CrossAssetCorrelation {
  asset: string;
  correlation: string;
  observation: string;
}

export interface TradeStrategy {
  direction: TrendDirection;
  entryRange: string;
  initialPosition: string;
  pyramidCondition: string;
  stopLoss: string;
  target: string;
  riskRewardRatio: string;
  timeFrame: string;
}

// 多维度分析视角
export interface DimensionView {
  dimension: AnalysisDimension;
  dimensionName: string;
  perspective: string;
  keyInsight: string;
}

// --- Reports ---

export interface ReportSummary {
  id: string;
  title: string;
  type: TimeFrame;
  date: string;
  coreThesis: string;
  scenario: MacroScenario;
  createdAt: string;
}

export interface ReportDetail extends ReportSummary {
  executiveSummary: string;
  macroBackground: string;
  marketAnalysis: string;
  tradeStrategies: string;
  risksAndCatalysts: string;
  disclaimer: string;
}

// --- Settings ---

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  regions: MarketRegion[];
  riskProfile: RiskProfile;
  analysisFocus: AnalysisDimension; // 偏好的分析维度侧重
  refreshInterval: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  regions: ["us", "europe", "asia", "emerging"],
  riskProfile: "balanced",
  analysisFocus: "integrated",
  refreshInterval: 60,
};

// --- UI Helpers ---

export const SCENARIO_CONFIG: Record<MacroScenario, { label: string; color: string; description: string }> = {
  inflation: { label: "通胀", color: "#FF9100", description: "增长上升 + 通胀上升" },
  deflation: { label: "通缩", color: "#4FC3F7", description: "增长下降 + 通胀下降" },
  goldilocks: { label: "金发姑娘", color: "#00C853", description: "增长上升 + 通胀温和" },
  stagflation: { label: "滞胀", color: "#FF1744", description: "增长下降 + 通胀上升" },
};

export const ASSET_CLASS_CONFIG: Record<AssetClass, { label: string; icon: string; flag: string }> = {
  cn_stocks: { label: "中国股票", icon: "show-chart", flag: "🇨🇳" },
  cn_bonds: { label: "中国债券", icon: "account-balance", flag: "🇨🇳" },
  us_stocks: { label: "美国股票", icon: "show-chart", flag: "🇺🇸" },
  us_bonds: { label: "美国债券", icon: "account-balance", flag: "🇺🇸" },
  gold: { label: "黄金", icon: "toll", flag: "🌐" },
  other_markets: { label: "其他市场", icon: "public", flag: "🌐" },
};

export const DIRECTION_CONFIG: Record<TrendDirection, { label: string; color: string }> = {
  bullish: { label: "看涨", color: "#00C853" },
  bearish: { label: "看跌", color: "#FF1744" },
  neutral: { label: "中性", color: "#64748B" },
};

// "AI宏观作手"分析维度配置
export const DIMENSION_CONFIG: Record<AnalysisDimension, { name: string; description: string; icon: string }> = {
  cycle: { name: "周期分析", description: "债务周期 · 经济周期 · 跨资产相关性", icon: "loop" },
  reflexivity: { name: "反身性分析", description: "市场偏见 · 预期差 · 反转信号", icon: "swap-vert" },
  liquidity: { name: "流动性分析", description: "央行政策 · M2增速 · 资金流向", icon: "water-drop" },
  technical: { name: "技术趋势", description: "关键点位 · 均线系统 · 不对称风报比", icon: "show-chart" },
  integrated: { name: "综合视角", description: "融合四大维度的全局研判", icon: "hub" },
};
