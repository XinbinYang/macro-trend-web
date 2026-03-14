"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, Target, History, Radar, TrendingUp, TrendingDown, 
  Minus, Activity, Globe, Flag, AlertTriangle, 
  ChevronRight, TrendingDown as TrendingDownIcon,
  Zap, Shield, Scale, Wallet
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { fetchMacroIndicatorsAbs, indexById } from "@/lib/adapters/macroIndicators";
import { fetchCnMacroSnapshot, type CnMacroSnapshot } from "@/lib/api/macro-cn";

// Types
interface AssetPreference {
  summary: string;
  preferred: Array<{ asset: string; reason: string; weight: string }>;
  cautious: Array<{ asset: string; reason: string; weight: string }>;
  riskAlerts: Array<{ level: string; alert: string; action: string }>;
}

interface CounterSignal {
  condition: string;
  implication: string;
  action: string;
  linkedMonitor?: string;
  triggerType?: string;
  severity?: "high" | "medium" | "low";
  triggered?: boolean;
}

interface RegimeData {
  region: string;
  status: string;
  updatedAt: string;
  regime: {
    name: string;
    confidence: number;
    driver: string;
    assetPreference?: AssetPreference;
    counterSignals: CounterSignal[];
    thresholds?: Record<string, number>;
    us_cn_comparison?: UsCnComparison;
  };
}

interface UsCnComparison {
  growth: MacroDimension;
  inflation: MacroDimension;
  policy: MacroDimension;
  liquidity: MacroDimension;
}

interface MacroDimension {
  status: string;
  trend: string;
  level: string;
  us?: { status: string; trend: string; level: string };
  cn?: { status: string; trend: string; level: string };
}

interface RegimeHistoryItem {
  period: string;
  tag: string;
  summary: string;
  keyEvents?: string[];
  assetPerformance?: Record<string, string>;
  counterSignalsTriggered?: string[];
  lessons?: string;
}

interface MonitorItem {
  name: string;
  region: string;
  why: string;
  watch: string;
  category?: string;
  threshold?: {
    bullish?: string;
    neutral?: string;
    bearish?: string;
  };
  current?: string;
  linkedSignals?: string[];
  linkedHistory?: string[];
  dataSource?: string;
  updateFrequency?: string;
}

interface BondFutureQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
  dataType: "REALTIME" | "EOD";
  status: "LIVE" | "DELAYED" | "STALE" | "OFF";
}

interface CnYieldCurve {
  date: string;
  maturities: Record<string, number>;
  source: string;
  status: string;
}

interface CnBondData {
  futures: BondFutureQuote[];
  yieldCurve: CnYieldCurve | { maturity: string; yield: number }[] | null;
  source: string;
  status: "LIVE" | "DELAYED" | "STALE" | "OFF";
}

// Phase 2: Helper for confidence bar color
const getConfidenceColor = (confidence: number) => {
  if (confidence > 70) return "bg-emerald-500";
  if (confidence >= 40) return "bg-amber-500";
  return "bg-red-500";
};

// Phase 2: Helper for trend badge color
const getTrendBadgeColor = (trendLabel: string) => {
  if (trendLabel.includes("↑")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (trendLabel.includes("↓")) return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-slate-700/50 text-slate-400 border-slate-600";
};

// Helper functions
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    soft_landing: "text-blue-400",
    weak_recovery: "text-red-400",
    disinflation: "text-emerald-400",
    low_inflation: "text-slate-400",
    restrictive: "text-amber-400",
    accommodative: "text-emerald-400",
    tightening: "text-amber-400",
    easing: "text-emerald-400",
  };
  return colors[status] || "text-slate-400";
};

const getTrendIcon = (trend: string) => {
  if (trend.includes("up") || trend.includes("improving") || trend.includes("easing")) {
    return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  }
  if (trend.includes("down") || trend.includes("declining") || trend.includes("tightening")) {
    return <TrendingDownIcon className="w-3 h-3 text-red-400" />;
  }
  return <Minus className="w-3 h-3 text-slate-400" />;
};

const getSeverityColor = (severity?: string) => {
  switch (severity) {
    case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default: return "bg-slate-700/50 text-slate-400 border-slate-600";
  }
};

const getCategoryIcon = (category?: string) => {
  switch (category) {
    case "Rates": return <Activity className="w-4 h-4" />;
    case "Policy": return <Target className="w-4 h-4" />;
    case "Growth": return <TrendingUp className="w-4 h-4" />;
    case "Inflation": return <Zap className="w-4 h-4" />;
    case "Credit": return <Shield className="w-4 h-4" />;
    case "Liquidity": return <Globe className="w-4 h-4" />;
    case "Cross-Asset": return <Scale className="w-4 h-4" />;
    default: return <Radar className="w-4 h-4" />;
  }
};

// Safe fetch helper with fail-soft: check res.ok + content-type before parse
async function safeFetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[SafeFetch] ${url} returned ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.warn(`[SafeFetch] ${url} content-type is not JSON: ${contentType}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[SafeFetch] ${url} failed:`, e);
    return null;
  }
}

export default function MacroPage() {
  const [usById, setUsById] = useState<Record<string, { value: number | null; asOf: string | null; source: string }> | null>(null);
  const [cn, setCn] = useState<CnMacroSnapshot | null>(null);
  const [regime, setRegime] = useState<RegimeData | null>(null);
  const [macroState, setMacroState] = useState<{
    success: boolean;
    updatedAt: string;
    regime: { name: string; confidence: number; driver: string; score: number };
    dimensions: Array<{
      dim: string;
      name: string;
      us: { value: number | null; state: string; summary: string; evidence: string[]; confidence: number; trendLabel: string };
      cn: { value: number | null; state: string; summary: string; evidence: string[]; confidence: number; trendLabel: string };
    }>;
  } | null>(null);
  const [history, setHistory] = useState<RegimeHistoryItem[]>([]);
  const [monitorItems, setMonitorItems] = useState<MonitorItem[]>([]);
  const [cnBondData, setCnBondData] = useState<CnBondData | null>(null);
  const [cnBondLoading, setCnBondLoading] = useState(true);
  // 三大中枢联动：组合偏离数据
  // NOTE: /api/risk-exposure returns { weight, targetWeight, deviation, ... }
  const [portfolioExposure, setPortfolioExposure] = useState<Array<{
    assetClass: string;
    label: string;
    weight: number;
    targetWeight: number;
    deviation: number;
    source: string;
    riskContribution?: number;
    targetRiskContribution?: number;
    riskDeviation?: number;
  }> | null>(null);
  const [exposureLoading, setExposureLoading] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const run = async () => {
      try {
        const origin = window.location.origin;
        const res = await fetchMacroIndicatorsAbs(origin);
        if (res) {
          const byId = indexById(res.indicators) as Record<string, { value: number | null; asOf: string | null; source: string }>;
          setUsById(byId);
          // CN snapshot: prefer Supabase-backed /api/macro-indicators ids, fallback to legacy /api/macro-cn
          setCn({
            region: "CN",
            status: "LIVE",
            updatedAt: res.updatedAt,
            asOf: null,
            series: {
              pmi_mfg: byId.cn_pmi_mfg ? { value: byId.cn_pmi_mfg.value, asOf: byId.cn_pmi_mfg.asOf, source: byId.cn_pmi_mfg.source } : undefined,
              cpi_yoy: byId.cn_cpi_yoy ? { value: byId.cn_cpi_yoy.value, asOf: byId.cn_cpi_yoy.asOf, source: byId.cn_cpi_yoy.source } : undefined,
              m2_yoy: byId.cn_m2_yoy ? { value: byId.cn_m2_yoy.value, asOf: byId.cn_m2_yoy.asOf, source: byId.cn_m2_yoy.source, unit: "%" } : undefined,
              lpr_1y: byId.cn_lpr_1y ? { value: byId.cn_lpr_1y.value, asOf: byId.cn_lpr_1y.asOf, source: byId.cn_lpr_1y.source } : undefined,
              unemployment_urban: byId.cn_unemployment ? { value: byId.cn_unemployment.value, asOf: byId.cn_unemployment.asOf, source: byId.cn_unemployment.source, unit: "%" } : undefined,
              social_financing: undefined,
            },
            notes: "CN macro uses Supabase-backed /api/macro-indicators when available",
          } as CnMacroSnapshot);
        }
      } catch {}

      // Legacy CN macro snapshot fallback
      try {
        const cnRes = await fetchCnMacroSnapshot();
        if (cnRes?.data) setCn(cnRes.data);
      } catch {}

      try {
        const res = await safeFetchJSON<{ success: boolean; data: RegimeData }>("/api/macro-regime");
        if (res?.success && res?.data) setRegime(res.data);
      } catch {}

      // Phase 2: Fetch macro-state for explainable dimensions
      try {
        const msRes = await safeFetchJSON<typeof macroState>("/api/macro-state?no_cache=1");
        if (msRes?.success && msRes?.dimensions) setMacroState(msRes);
      } catch (e) {
        console.warn("[MacroPage] Failed to fetch macro-state:", e);
      }

      try {
        const res = await safeFetchJSON<{ success: boolean; data: { history: RegimeHistoryItem[] } }>("/api/macro-history");
        if (res?.success && res?.data?.history) setHistory(res.data.history);
      } catch {}

      try {
        const res = await safeFetchJSON<{ success: boolean; data: { items: MonitorItem[] } }>("/api/macro-monitor");
        if (res?.success && res?.data?.items) setMonitorItems(res.data.items);
      } catch {}

      // 三大中枢联动：获取组合偏离数据
      try {
        setExposureLoading(true);
        const expRes = await safeFetchJSON<{ success: boolean; data: typeof portfolioExposure }>("/api/risk-exposure");
        if (expRes?.success && expRes?.data) {
          setPortfolioExposure(expRes.data);
        }
      } catch (e) {
        console.error("[MacroHub] Failed to fetch portfolio exposure:", e);
      } finally {
        setExposureLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const fetchCnBond = async () => {
      try {
        setCnBondLoading(true);
        const json = await safeFetchJSON<{ success: boolean; data?: CnBondData; source?: string; status?: string }>("/api/bond-cn?level=L2&fallback=true");
        if (json?.success) {
          // Transform CnYieldCurve to array format for LineChart
          let yieldCurveData: { maturity: string; yield: number }[] | null = null;
          const rawYieldCurve = json.data?.yieldCurve;
          if (rawYieldCurve && 'maturities' in rawYieldCurve && rawYieldCurve.maturities) {
            yieldCurveData = Object.entries(rawYieldCurve.maturities).map(([maturity, yield_]) => ({
              maturity,
              yield: yield_,
            }));
          } else if (Array.isArray(rawYieldCurve)) {
            yieldCurveData = rawYieldCurve;
          }
          setCnBondData({
            futures: json.data?.futures || [],
            yieldCurve: yieldCurveData,
            source: json.source || "Seed",
            status: (json.status as "LIVE" | "DELAYED" | "STALE" | "OFF") || "OFF",
          });
        }
      } catch (e) {
        console.error("[MacroHub] Failed to fetch CN bond data:", e);
      } finally {
        setCnBondLoading(false);
      }
    };
    fetchCnBond();
    const interval = setInterval(fetchCnBond, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Bond calculations
  const curveSpread = useMemo(() => {
    const futures = cnBondData?.futures || [];
    const tFuture = futures.find(f => f.symbol.startsWith("T") && !f.symbol.startsWith("TS") && !f.symbol.startsWith("TL"));
    const tlFuture = futures.find(f => f.symbol.startsWith("TL"));
    const tsFuture = futures.find(f => f.symbol.startsWith("TS"));
    const tfFuture = futures.find(f => f.symbol.startsWith("TF") && !f.symbol.startsWith("T"));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    
    if (tFuture && tlFuture) {
      result.tlT = {
        spread: (tlFuture.price - tFuture.price).toFixed(2),
        tPrice: tFuture.price,
        tlPrice: tlFuture.price,
        tChange: tFuture.changePercent,
        tlChange: tlFuture.changePercent,
        label: "30Y-10Y"
      };
    }
    
    if (tfFuture && tFuture) {
      result.tfT = {
        spread: (tFuture.price - tfFuture.price).toFixed(2),
        tPrice: tFuture.price,
        tlPrice: tfFuture.price,
        tChange: tFuture.changePercent,
        tlChange: tfFuture.changePercent,
        label: "10Y-5Y"
      };
    }
    
    if (tsFuture && tfFuture) {
      result.tsTf = {
        spread: (tfFuture.price - tsFuture.price).toFixed(2),
        tPrice: tfFuture.price,
        tlPrice: tsFuture.price,
        tChange: tfFuture.changePercent,
        tlChange: tsFuture.changePercent,
        label: "5Y-2Y"
      };
    }
    
    return result;
  }, [cnBondData]);

  const filteredHistory = useMemo(() => {
    if (!selectedMonitor) return history;
    const monitor = monitorItems.find(m => m.name === selectedMonitor);
    if (!monitor?.linkedHistory) return history;
    return history.filter(h => monitor.linkedHistory?.some(lh => h.period.includes(lh) || lh.includes(h.period)));
  }, [selectedMonitor, history, monitorItems]);

  const filteredMonitors = useMemo(() => {
    if (!selectedHistory) return monitorItems;
    const historyItem = history.find(h => h.period === selectedHistory);
    if (!historyItem?.counterSignalsTriggered) return monitorItems;
    return monitorItems.filter(m => 
      historyItem.counterSignalsTriggered?.some(cs => 
        m.linkedSignals?.some(() => cs.includes(m.name) || m.name.includes(cs.split(" ")[0]))
      )
    );
  }, [selectedHistory, history, monitorItems]);

  const getLinkedCounterSignals = (monitorName: string) => {
    const monitor = monitorItems.find(m => m.name === monitorName);
    if (!monitor?.linkedSignals) return [];
    return regime?.regime?.counterSignals?.filter(cs => 
      monitor.linkedSignals?.some(linkedSig => cs.condition.includes(linkedSig.split(" ")[0]) || linkedSig.includes(cs.condition.split(" ")[0]))
    ) || [];
  };

  const futureToMaturity: Record<string, string> = { "TS": "2Y", "TF": "5Y", "T": "10Y", "TL": "30Y" };
  const getMaturityLabel = (symbol: string): string => {
    const prefix = symbol.replace(/\d+$/, "");
    return futureToMaturity[prefix] || "—";
  };

  const getLiquidityInterpretation = () => {
    const futures = cnBondData?.futures || [];
    const tFuture = futures.find(f => f.symbol.startsWith("T") && !f.symbol.startsWith("TS") && !f.symbol.startsWith("TL"));
    const tlFuture = futures.find(f => f.symbol.startsWith("TL"));
    
    if (!tFuture || !tlFuture) {
      return { 
        title: "流动性状态待观测", 
        content: "国债期货数据加载中，暂无法判断流动性状态。", 
        trend: "neutral" as const,
        signals: []
      };
    }
    
    const curveSteepness = tlFuture.price - tFuture.price;
    const isSteepening = curveSteepness > 4.0;
    
    if (isSteepening) {
      return { 
        title: "曲线陡峭化 · 长端承压", 
        content: "30Y-10Y价差走阔，反映市场对长期通胀/增长预期升温，或久期需求减弱。",
        trend: "up" as const,
        signals: ["长端利率上行风险", "久期偏好下降", "增长预期改善"]
      };
    } else {
      return { 
        title: "曲线趋平 · 久期偏好", 
        content: "30Y-10Y价差收窄，显示市场对长期利率下行预期增强，或配置型资金拉长久期。",
        trend: "down" as const,
        signals: ["配置需求旺盛", "久期偏好上升", "宽松预期定价"]
      };
    }
  };

  const liquidityInterp = getLiquidityInterpretation();
  const usCnComparison = regime?.regime?.us_cn_comparison;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="space-y-2">
        <div className="text-sm text-amber-400 font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Macro Research Hub
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-50">宏观研究中枢 / Macro Hub</h1>
        <p className="text-sm text-slate-400">🌍 中美双主轴宏观研究 · 监控变量与反证条件联动 · 历史映射验证</p>
      </div>

      {/* Regime Card */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" /> 
              当前 Regime · {regime?.regime?.name || "Neutral"}
            </CardTitle>
            <Badge className={getSeverityColor(regime?.regime?.confidence && regime.regime.confidence > 70 ? "high" : regime?.regime?.confidence && regime.regime.confidence > 50 ? "medium" : "low")}>
              置信度 {regime?.regime?.confidence || 50}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge className="bg-slate-800 text-slate-200 border border-slate-700 text-sm px-3 py-1">
              {regime?.regime?.name || "Neutral"}
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">置信度:</span>
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${regime?.regime?.confidence || 50}%` }} />
              </div>
              <span className="text-sm text-slate-200">{regime?.regime?.confidence || 50}%</span>
            </div>
          </div>
          <div className="text-sm text-slate-300">
            <span className="text-slate-500">核心驱动:</span> {regime?.regime?.driver || "数据源恢复中，暂按中性基线显示"}
          </div>
          
          {/* 三大中枢联动：资产偏好与风险提示 */}
          {regime?.regime?.assetPreference && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-slate-200">资产偏好建议</span>
              </div>
              <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg">
                <div className="text-sm text-amber-300 mb-2">{regime.regime.assetPreference.summary}</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {/* 推荐资产 */}
                  <div className="space-y-2">
                    <div className="text-xs text-emerald-400 font-medium">✓ 推荐</div>
                    {regime.regime.assetPreference.preferred.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                          {item.weight}
                        </Badge>
                        <div>
                          <span className="text-slate-200">{item.asset}</span>
                          <span className="text-slate-500 ml-1">- {item.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 谨慎资产 */}
                  <div className="space-y-2">
                    <div className="text-xs text-amber-400 font-medium">⚠ 谨慎</div>
                    {regime.regime.assetPreference.cautious.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                          {item.weight}
                        </Badge>
                        <div>
                          <span className="text-slate-200">{item.asset}</span>
                          <span className="text-slate-500 ml-1">- {item.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 风险警示 */}
                {regime.regime.assetPreference.riskAlerts && regime.regime.assetPreference.riskAlerts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-800/30">
                    <div className="text-xs text-red-400 font-medium mb-2">🚨 风险警示</div>
                    <div className="flex flex-wrap gap-2">
                      {regime.regime.assetPreference.riskAlerts.map((alert, idx) => (
                        <Badge key={idx} className={`text-[10px] ${
                          alert.level === "high" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }`}>
                          {alert.alert} → {alert.action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
            <div className="text-center p-2 bg-slate-950/50 rounded">
              <div className="text-xs text-slate-500">美国 ISM</div>
              <div className="text-lg font-mono text-slate-200">{usById?.us_ism_pmi?.value?.toFixed(1) || "—"}</div>
            </div>
            <div className="text-center p-2 bg-slate-950/50 rounded">
              <div className="text-xs text-slate-500">美国 CPI YoY</div>
              <div className="text-lg font-mono text-slate-200">{usById?.us_cpi_yoy?.value?.toFixed(1) || "—"}%</div>
              <div className="text-[10px] text-slate-600 mt-1">Index: {usById?.us_cpi?.value?.toFixed(1) || "—"}</div>
            </div>
            <div className="text-center p-2 bg-slate-950/50 rounded">
              <div className="text-xs text-slate-500">中国 PMI</div>
              <div className="text-lg font-mono text-slate-200">{cn?.series?.pmi_mfg?.value?.toFixed(1) || "—"}</div>
            </div>
            <div className="text-center p-2 bg-slate-950/50 rounded">
              <div className="text-xs text-slate-500">中国 CPI</div>
              <div className="text-lg font-mono text-slate-200">{cn?.series?.cpi_yoy?.value?.toFixed(1) || "—"}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 三大中枢联动：组合偏离概览卡 */}
      {(portfolioExposure && portfolioExposure.length > 0) || exposureLoading ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" /> 
                组合偏离概览 / Portfolio Drift
              </CardTitle>
              <Badge variant="outline" className="text-xs border-slate-700">
                {exposureLoading ? "加载中..." : "基于风险暴露计算"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {exposureLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-3 rounded-lg border bg-slate-950/50 border-slate-800 animate-pulse">
                    <div className="h-3 w-12 bg-slate-800 rounded mb-2"></div>
                    <div className="h-4 w-16 bg-slate-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : portfolioExposure && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {portfolioExposure.map((item) => {
                  // Be tolerant to legacy fields (current/target) to avoid client-side crashes
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const legacy = item as any;
                  const wRaw = typeof item.weight === "number" ? item.weight : legacy.current;
                  const tRaw = typeof item.targetWeight === "number" ? item.targetWeight : legacy.target;
                  const wNum = typeof wRaw === "number" ? wRaw : Number(wRaw);
                  const tNum = typeof tRaw === "number" ? tRaw : Number(tRaw);

                  return (
                    <div 
                      key={item.assetClass}
                      className={`p-3 rounded-lg border ${
                        Math.abs(item.deviation) > 3 
                          ? item.deviation > 0 
                            ? "bg-red-950/20 border-red-800/40" 
                            : "bg-blue-950/20 border-blue-800/40"
                          : "bg-slate-950/50 border-slate-800"
                      }`}
                    >
                      <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-200">{Number.isFinite(wNum) ? wNum.toFixed(1) : "—"}%</div>
                          <div className="text-[10px] text-slate-500">目标 {Number.isFinite(tNum) ? tNum : "—"}%</div>
                        </div>
                        <div className={`text-xs font-mono ${
                          item.deviation > 0 ? "text-red-400" : item.deviation < 0 ? "text-blue-400" : "text-slate-400"
                        }`}>
                          {item.deviation > 0 ? "+" : ""}{item.deviation.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900/50 border border-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800">总览</TabsTrigger>
          <TabsTrigger value="us-cn" className="data-[state=active]:bg-slate-800">🇺🇸🇨🇳 中美主轴</TabsTrigger>
          <TabsTrigger value="bonds" className="data-[state=active]:bg-slate-800">🇨🇳 债券研究</TabsTrigger>
          <TabsTrigger value="signals" className="data-[state=active]:bg-slate-800">监控与反证</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Four Dimension Cards - Phase 2 Enhanced */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Phase 2: Map dimension keys to index */}
            {(() => {
              const dimMap: Record<string, number> = { growth: 0, inflation: 1, policy: 2, liquidity: 3 };
              const items = [
                { title: "增长 Growth", dimKey: "growth", usLabel: "ISM", cnLabel: "PMI", icon: TrendingUp },
                { title: "通胀 Inflation", dimKey: "inflation", usLabel: "Core PCE", cnLabel: "CPI", icon: Activity },
                { title: "政策 Policy", dimKey: "policy", usLabel: "SOFR", cnLabel: "LPR", icon: Target },
                { title: "流动性 Liquidity", dimKey: "liquidity", usLabel: "10Y", cnLabel: "M2", icon: Globe },
              ];
              
              return items.map((item) => {
                const dimIdx = dimMap[item.dimKey];
                const dimData = macroState?.dimensions?.[dimIdx];
                const usData = dimData?.us;
                const cnData = dimData?.cn;
                
                return (
                  <Card key={item.title} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-slate-400" />
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* US Section */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-slate-950/50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🇺🇸</span>
                            <span className="text-xs text-slate-500">{item.usLabel}</span>
                          </div>
                          <span className="text-slate-200 font-mono font-medium">
                            {usData?.value !== null && usData?.value !== undefined ? usData.value.toFixed(1) : "—"}
                          </span>
                        </div>
                        {/* Phase 2: Summary */}
                        {usData?.summary && (
                          <div className="text-xs text-slate-200 font-medium px-1 leading-snug">
                            {usData.summary}
                          </div>
                        )}
                        {/* Phase 2: Trend Badge + Confidence */}
                        {usData?.trendLabel && (
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] border ${getTrendBadgeColor(usData.trendLabel)}`}>
                              {usData.trendLabel}
                            </Badge>
                            <div className="flex-1 flex items-center gap-1">
                              <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${getConfidenceColor(usData.confidence)} transition-all`} 
                                  style={{ width: `${usData.confidence}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 w-8">{usData.confidence}%</span>
                            </div>
                          </div>
                        )}
                        {/* Phase 2: Evidence折叠 */}
                        {usData?.evidence && usData.evidence.length > 0 && (
                          <details className="text-[10px]">
                            <summary className="cursor-pointer text-slate-500 hover:text-slate-300 flex items-center gap-1">
                              📋 证据
                            </summary>
                            <div className="mt-1 pl-2 space-y-0.5 text-slate-400">
                              {usData.evidence.map((ev, i) => (
                                <div key={i}>• {ev}</div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                      
                      {/* CN Section */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-slate-950/50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🇨🇳</span>
                            <span className="text-xs text-slate-500">{item.cnLabel}</span>
                          </div>
                          <span className="text-slate-200 font-mono font-medium">
                            {cnData?.value !== null && cnData?.value !== undefined ? cnData.value.toFixed(1) : "—"}
                          </span>
                        </div>
                        {/* Phase 2: Summary */}
                        {cnData?.summary && (
                          <div className="text-xs text-slate-200 font-medium px-1 leading-snug">
                            {cnData.summary}
                          </div>
                        )}
                        {/* Phase 2: Trend Badge + Confidence */}
                        {cnData?.trendLabel && (
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] border ${getTrendBadgeColor(cnData.trendLabel)}`}>
                              {cnData.trendLabel}
                            </Badge>
                            <div className="flex-1 flex items-center gap-1">
                              <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${getConfidenceColor(cnData.confidence)} transition-all`} 
                                  style={{ width: `${cnData.confidence}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 w-8">{cnData.confidence}%</span>
                            </div>
                          </div>
                        )}
                        {/* Phase 2: Evidence折叠 */}
                        {cnData?.evidence && cnData.evidence.length > 0 && (
                          <details className="text-[10px]">
                            <summary className="cursor-pointer text-slate-500 hover:text-slate-300 flex items-center gap-1">
                              📋 证据
                            </summary>
                            <div className="mt-1 pl-2 space-y-0.5 text-slate-400">
                              {cnData.evidence.map((ev, i) => (
                                <div key={i}>• {ev}</div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-amber-500/50 transition-colors group" onClick={() => setActiveTab("us-cn")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                    <Globe className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-sm text-slate-200 block">中美宏观对比</span>
                    <span className="text-xs text-slate-500">周期错位与政策分化</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-emerald-500/50 transition-colors group" onClick={() => setActiveTab("bonds")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <Activity className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-sm text-slate-200 block">中国债券研究</span>
                    <span className="text-xs text-slate-500">期限结构与流动性</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-cyan-500/50 transition-colors group" onClick={() => setActiveTab("signals")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                    <Radar className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <span className="text-sm text-slate-200 block">监控与反证条件</span>
                    <span className="text-xs text-slate-500">联动验证与历史映射</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </CardContent>
            </Card>
          </div>

          {/* Active Counter Signals Preview */}
          {regime?.regime?.counterSignals && regime.regime.counterSignals.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  活跃反证条件 / Active Counter Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {regime.regime.counterSignals.slice(0, 4).map((signal, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${signal.severity === 'high' ? 'bg-red-500' : signal.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200 font-medium truncate">{signal.condition}</div>
                        <div className="text-xs text-slate-500 mt-1">{signal.implication}</div>
                        <div className="text-xs text-amber-400 mt-1">→ {signal.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* US-CN Comparison Tab */}
        <TabsContent value="us-cn" className="space-y-6 mt-6">
          {/* Comparison Matrix */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-500" />
                🇺🇸🇨🇳 中美宏观周期对比矩阵
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-2 text-xs text-slate-500 font-medium">维度</th>
                      <th className="text-center py-3 px-2 text-xs text-slate-500 font-medium">🇺🇸 美国</th>
                      <th className="text-center py-3 px-2 text-xs text-slate-500 font-medium">🇨🇳 中国</th>
                      <th className="text-center py-3 px-2 text-xs text-slate-500 font-medium">错位分析</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { 
                        dimension: "增长 Growth", 
                        us: usCnComparison?.growth?.us || { status: "soft_landing", trend: "stable", level: "moderate" },
                        cn: usCnComparison?.growth?.cn || { status: "weak_recovery", trend: "improving_slowly", level: "below_potential" },
                        usValue: usById?.us_ism_pmi?.value,
                        cnValue: cn?.series?.pmi_mfg?.value,
                        usLabel: "ISM",
                        cnLabel: "PMI",
                        analysis: "美强中弱"
                      },
                      { 
                        dimension: "通胀 Inflation", 
                        us: usCnComparison?.inflation?.us || { status: "disinflation", trend: "declining", level: "moderate" },
                        cn: usCnComparison?.inflation?.cn || { status: "low_inflation", trend: "stable_low", level: "below_target" },
                        usValue: usById?.us_cpi_yoy?.value,
                        cnValue: cn?.series?.cpi_yoy?.value,
                        usLabel: "CPI YoY",
                        cnLabel: "CPI",
                        analysis: "美高中低"
                      },
                      { 
                        dimension: "政策 Policy", 
                        us: usCnComparison?.policy?.us || { status: "restrictive", trend: "easing_expected", level: "tight" },
                        cn: usCnComparison?.policy?.cn || { status: "accommodative", trend: "easing", level: "loose" },
                        usValue: usById?.us_fedfunds?.value,
                        cnValue: cn?.series?.lpr_1y?.value,
                        usLabel: "Fed Funds",
                        cnLabel: "LPR 1Y",
                        analysis: "美紧中松"
                      },
                      { 
                        dimension: "流动性 Liquidity", 
                        us: usCnComparison?.liquidity?.us || { status: "tightening", trend: "stable", level: "neutral_tight" },
                        cn: usCnComparison?.liquidity?.cn || { status: "easing", trend: "easing", level: "neutral_loose" },
                        usValue: usById?.us_10y?.value,
                        cnValue: cn?.series?.m2_yoy?.value,
                        usLabel: "10Y Yield",
                        cnLabel: "M2 YoY",
                        analysis: "美紧中松"
                      },
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50 last:border-0">
                        <td className="py-4 px-2">
                          <div className="text-sm text-slate-200 font-medium">{row.dimension}</div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-center">
                            <Badge variant="outline" className={`text-xs border-slate-700 ${getStatusColor(row.us.status)}`}>
                              {row.us.status}
                            </Badge>
                            <div className="flex items-center justify-center gap-1 mt-2">
                              {getTrendIcon(row.us.trend)}
                              <span className="text-xs text-slate-500">{row.us.trend}</span>
                            </div>
                            {row.usValue && (
                              <div className="mt-2 text-lg font-mono text-slate-200">
                                {row.usValue.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-center">
                            <Badge variant="outline" className={`text-xs border-slate-700 ${getStatusColor(row.cn.status)}`}>
                              {row.cn.status}
                            </Badge>
                            <div className="flex items-center justify-center gap-1 mt-2">
                              {getTrendIcon(row.cn.trend)}
                              <span className="text-xs text-slate-500">{row.cn.trend}</span>
                            </div>
                            {row.cnValue && (
                              <div className="mt-2 text-lg font-mono text-slate-200">
                                {row.cnValue.toFixed(1)}{row.cnLabel === "CPI" ? "%" : ""}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-center">
                            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs">
                              {row.analysis}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cycle Divergence Analysis */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="text-sm font-medium text-slate-200 mb-3">周期错位分析 / Cycle Divergence</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Flag className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-slate-200">美国：软着陆预期</span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-2">
                      <li>• 增长：ISM 制造业 PMI 处于扩张边缘，服务业保持韧性</li>
                      <li>• 通胀：CPI 持续回落，但核心通胀仍高于目标</li>
                      <li>• 政策：美联储维持限制性利率，但降息预期仍在</li>
                      <li>• 流动性：10Y 收益率高位震荡，期限利差修复</li>
                    </ul>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Flag className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-slate-200">中国：弱复苏阶段</span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-2">
                      <li>• 增长：制造业 PMI 在荣枯线附近波动，内需不足</li>
                      <li>• 通胀：CPI 低位运行，通缩压力仍存</li>
                      <li>• 政策：货币政策宽松，财政发力稳增长</li>
                      <li>• 流动性：M2 增速较高，但信用传导不畅</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div className="text-xs text-amber-400">
                      <strong>投资启示：</strong>中美周期错位意味着资产表现可能分化。美国软着陆预期支撑美元与美股，中国弱复苏阶段债券与红利资产相对占优。需关注汇率波动与跨境资本流动风险。
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bonds Tab */}
        <TabsContent value="bonds" className="space-y-6 mt-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                🇨🇳 中国债券研究层 / China Bond Research
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Futures Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-200">国债期货主力合约 / Treasury Futures</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${
                      cnBondData?.status === "LIVE" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                      cnBondData?.status === "DELAYED" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                      "bg-slate-700/50 text-slate-400 border-slate-600"
                    }`}>
                      {cnBondData?.status === "LIVE" ? "实时" : cnBondData?.status === "DELAYED" ? "延迟" : "Seed"}
                    </Badge>
                    <span className="text-[10px] text-slate-500">{cnBondData?.source || "—"}</span>
                  </div>
                </div>
                
                {cnBondLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 bg-slate-800" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(cnBondData?.futures || []).map((future) => {
                      const isPositive = future.change >= 0;
                      return (
                        <div key={future.symbol} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400">{getMaturityLabel(future.symbol)} 国债期货</span>
                            <span className="text-[10px] font-mono text-slate-500">{future.symbol}</span>
                          </div>
                          <div className="text-lg font-bold text-slate-50">{future.price.toFixed(3)}</div>
                          <div className={`flex items-center text-xs ${isPositive ? "text-red-400" : "text-green-400"}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {isPositive ? "+" : ""}{future.changePercent.toFixed(2)}%
                          </div>
                          <div className="text-[9px] text-slate-600 mt-1">Vol: {(future.volume / 10000).toFixed(1)}万手</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Curve Spread Section - Enhanced */}
              {curveSpread && curveSpread.tlT && (
                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-200">期限利差监控 / Curve Spread Monitor</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-slate-700">TL-T: {curveSpread.tlT.spread}元</Badge>
                      {curveSpread.tfT && <Badge variant="outline" className="text-xs border-slate-700">T-TF: {curveSpread.tfT.spread}元</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {curveSpread.tsTf && (
                      <div className="text-center p-3 bg-slate-900/50 rounded">
                        <div className="text-xs text-slate-500 mb-1">2Y 主力 (TS)</div>
                        <div className="text-lg font-mono text-slate-200">{curveSpread.tsTf.tsPrice.toFixed(3)}</div>
                      </div>
                    )}
                    {curveSpread.tfT && (
                      <div className="text-center p-3 bg-slate-900/50 rounded">
                        <div className="text-xs text-slate-500 mb-1">5Y 主力 (TF)</div>
                        <div className="text-lg font-mono text-slate-200">{curveSpread.tfT.tfPrice.toFixed(3)}</div>
                      </div>
                    )}
                    {curveSpread.tlT && (
                      <>
                        <div className="text-center p-3 bg-slate-900/50 rounded">
                          <div className="text-xs text-slate-500 mb-1">10Y 主力 (T)</div>
                          <div className="text-lg font-mono text-slate-200">{curveSpread.tlT.tPrice.toFixed(3)}</div>
                          <div className={`text-xs ${curveSpread.tlT.tChange >= 0 ? "text-red-400" : "text-green-400"}`}>
                            {curveSpread.tlT.tChange >= 0 ? "+" : ""}{curveSpread.tlT.tChange.toFixed(2)}%
                          </div>
                        </div>
                        <div className="text-center p-3 bg-slate-900/50 rounded">
                          <div className="text-xs text-slate-500 mb-1">30Y 主力 (TL)</div>
                          <div className="text-lg font-mono text-slate-200">{curveSpread.tlT.tlPrice.toFixed(3)}</div>
                          <div className={`text-xs ${curveSpread.tlT.tlChange >= 0 ? "text-red-400" : "text-green-400"}`}>
                            {curveSpread.tlT.tlChange >= 0 ? "+" : ""}{curveSpread.tlT.tlChange.toFixed(2)}%
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Yield Curve & Liquidity Analysis */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-200 mb-3">收益率曲线 / Yield Curve</h3>
                  {cnBondLoading ? (
                    <Skeleton className="h-48 bg-slate-800" />
                  ) : cnBondData?.yieldCurve && Array.isArray(cnBondData.yieldCurve) && cnBondData.yieldCurve.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cnBondData.yieldCurve}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="maturity" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} domain={['dataMin - 0.1', 'dataMax + 0.1']} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px' }} formatter={(value) => [`${Number(value).toFixed(2)}%`, "收益率"]} />
                          <ReferenceLine y={0} stroke="#334155" strokeDasharray="2 2" />
                          <Line type="monotone" dataKey="yield" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-slate-950/60 border border-slate-800 rounded-lg">
                      <div className="text-center">
                        <Minus className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <span className="text-xs text-slate-500">收益率曲线数据暂不可用</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-200 mb-3">流动性解读 / Liquidity Interpretation</h3>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 h-48">
                    <div className="flex items-start gap-3 mb-3">
                      {liquidityInterp.trend === "up" ? (
                        <TrendingUp className="w-5 h-5 text-amber-400 mt-0.5" />
                      ) : liquidityInterp.trend === "down" ? (
                        <TrendingDown className="w-5 h-5 text-blue-400 mt-0.5" />
                      ) : (
                        <Minus className="w-5 h-5 text-slate-400 mt-0.5" />
                      )}
                      <div>
                        <div className={`text-sm font-medium ${
                          liquidityInterp.trend === "up" ? "text-amber-400" :
                          liquidityInterp.trend === "down" ? "text-blue-400" :
                          "text-slate-400"
                        }`}>
                          {liquidityInterp.title}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {liquidityInterp.content}
                    </p>
                    {liquidityInterp.signals && liquidityInterp.signals.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {liquidityInterp.signals.map((signal, idx) => (
                          <Badge key={idx} variant="outline" className="text-[9px] bg-slate-800/50 text-slate-400 border-slate-700">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bond Research Layers */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-slate-200">L1: 资金面</span>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1.5">
                    <li>• DR007 与政策利率偏离度</li>
                    <li>• 银行间质押式回购成交量</li>
                    <li>• MLF 操作与到期压力</li>
                  </ul>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium text-slate-200">L2: 期限结构</span>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1.5">
                    <li>• 国债期货期限利差 (TL-T)</li>
                    <li>• 现券收益率曲线形态</li>
                    <li>• 骑乘策略可行性</li>
                  </ul>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-medium text-slate-200">L3: 信用与政策</span>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1.5">
                    <li>• 社融增速与信用扩张</li>
                    <li>• LPR 调降预期</li>
                    <li>• 房地产债务风险传导</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals" className="space-y-6 mt-6">
          {/* Selection Status Bar */}
          {(selectedMonitor || selectedHistory) && (
            <div className="flex items-center gap-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-500">当前筛选:</span>
              {selectedMonitor && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                  监控: {selectedMonitor}
                  <button onClick={() => setSelectedMonitor(null)} className="ml-1 hover:text-cyan-200">×</button>
                </Badge>
              )}
              {selectedHistory && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  历史: {selectedHistory}
                  <button onClick={() => setSelectedHistory(null)} className="ml-1 hover:text-amber-200">×</button>
                </Badge>
              )}
              <button 
                onClick={() => { setSelectedMonitor(null); setSelectedHistory(null); }}
                className="text-xs text-slate-500 hover:text-slate-300 ml-auto"
              >
                清除筛选
              </button>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Monitor Variables */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Radar className="w-5 h-5 text-cyan-400" />
                  监控变量 / Monitor Variables
                  {selectedHistory && (
                    <Badge variant="outline" className="text-xs ml-2 border-amber-500/50 text-amber-400">
                      已筛选
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(selectedHistory ? filteredMonitors : monitorItems).length > 0 ? (selectedHistory ? filteredMonitors : monitorItems).map((item) => {
                  const linkedSignals = getLinkedCounterSignals(item.name);
                  const isSelected = selectedMonitor === item.name;
                  return (
                    <div 
                      key={item.name} 
                      className={`rounded-lg border p-3 cursor-pointer transition-all ${
                        isSelected ? "border-cyan-500/50 bg-cyan-950/20" : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                      }`}
                      onClick={() => setSelectedMonitor(isSelected ? null : item.name)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${
                          item.region === "US" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                          item.region === "CN" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                          "bg-slate-800 text-slate-300 border-slate-700"
                        }`}>
                          {item.region}
                        </Badge>
                        {item.category && (
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 flex items-center gap-1">
                            {getCategoryIcon(item.category)}
                            {item.category}
                          </Badge>
                        )}
                        <span className="text-sm font-medium text-slate-100">{item.name}</span>
                        {linkedSignals.length > 0 && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                            {linkedSignals.length} 个关联反证
                          </Badge>
                        )}
                      </div>
                      {item.current && <div className="text-xs text-cyan-300 mt-2">📊 <span className="text-slate-400">当前:</span> {item.current}</div>}
                      <div className="text-xs text-slate-400 mt-2">📌 <span className="text-slate-500">原因:</span> {item.why}</div>
                      <div className="text-xs text-amber-300 mt-1">⚠️ <span className="text-amber-400/80">观察:</span> {item.watch}</div>
                      {item.threshold && (
                        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                          {item.threshold.bullish && <div className="text-green-400">🟢 {item.threshold.bullish}</div>}
                          {item.threshold.neutral && <div className="text-slate-400">⚪ {item.threshold.neutral}</div>}
                          {item.threshold.bearish && <div className="text-red-400">🔴 {item.threshold.bearish}</div>}
                        </div>
                      )}
                      {(item.dataSource || item.updateFrequency) && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-600">
                          {item.dataSource && <span>来源: {item.dataSource}</span>}
                          {item.updateFrequency && <span>• 更新: {item.updateFrequency}</span>}
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-xs text-slate-500 text-center py-8">
                    {selectedHistory ? "该历史时期暂无关联监控变量" : "暂无监控变量数据"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Historical Mapping */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  历史映射 / Historical Mapping
                  {selectedMonitor && (
                    <Badge variant="outline" className="text-xs ml-2 border-cyan-500/50 text-cyan-400">
                      已筛选
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredHistory.length > 0 ? filteredHistory.map((item) => {
                  const isSelected = selectedHistory === item.period;
                  return (
                    <div 
                      key={item.period} 
                      className={`rounded-lg border p-3 cursor-pointer transition-all ${
                        isSelected ? "border-amber-500/50 bg-amber-950/20" : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                      }`}
                      onClick={() => setSelectedHistory(isSelected ? null : item.period)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{item.tag}</Badge>
                        <span className="text-sm font-medium text-slate-100">{item.period}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">{item.summary}</div>
                      {item.keyEvents && item.keyEvents.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.keyEvents.map((evt, idx) => (
                            <Badge key={idx} variant="outline" className="text-[9px] border-slate-700 text-slate-500">
                              {evt}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {item.counterSignalsTriggered && item.counterSignalsTriggered.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.counterSignalsTriggered.map((sig, idx) => (
                            <Badge key={idx} variant="outline" className="text-[9px] border-red-500/30 text-red-400">
                              {sig}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {item.assetPerformance && (
                        <div className="mt-2 grid grid-cols-4 gap-1 text-[9px]">
                          {Object.entries(item.assetPerformance).map(([asset, perf]) => (
                            <div key={asset} className="text-center p-1 bg-slate-900/50 rounded">
                              <span className="text-slate-500">{asset}</span>
                              <div className="text-slate-300">{perf}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.lessons && (
                        <div className="mt-2 text-[10px] text-amber-400/80 italic">
                          💡 {item.lessons}
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-xs text-slate-500 text-center py-8">
                    {selectedMonitor ? "该监控变量暂无关联历史映射" : "暂无历史映射数据"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Counter Signals */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                反证条件 / Counter Signals
                {selectedMonitor && (
                  <Badge variant="outline" className="text-xs ml-2 border-cyan-500/50 text-cyan-400">
                    已筛选
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(selectedMonitor ? getLinkedCounterSignals(selectedMonitor) : regime?.regime?.counterSignals || []).length > 0 ? (
                (selectedMonitor ? getLinkedCounterSignals(selectedMonitor) : regime?.regime?.counterSignals || []).map((item) => (
                  <div key={item.condition} className={`rounded-lg border p-3 text-sm space-y-2 ${
                    item.severity === "high" ? "border-red-900/50 bg-red-950/10" : 
                    item.severity === "medium" ? "border-amber-900/50 bg-amber-950/10" :
                    "border-slate-800 bg-slate-950/60"
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-200 font-medium">📌 <span className="text-slate-400 font-normal">条件:</span> {item.condition}</span>
                      {item.severity && (
                        <Badge variant="outline" className={`text-[10px] ${
                          item.severity === "high" ? "border-red-500/30 text-red-400" :
                          item.severity === "medium" ? "border-amber-500/30 text-amber-400" :
                          "border-slate-600 text-slate-400"
                        }`}>
                          {item.severity === "high" ? "高风险" : item.severity === "medium" ? "中风险" : "低风险"}
                        </Badge>
                      )}
                      {item.triggerType && (
                        <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                          {item.triggerType === "threshold_cross" ? "阈值突破" : 
                           item.triggerType === "persistence" ? "持续触发" : 
                           item.triggerType === "divergence" ? "背离信号" : item.triggerType}
                        </Badge>
                      )}
                    </div>
                    <div className="text-slate-400">🧭 <span className="text-slate-500">含义:</span> {item.implication}</div>
                    <div className="text-amber-300">🎯 <span className="text-amber-400/80">应对:</span> {item.action}</div>
                    {item.linkedMonitor && (
                      <div className="text-[10px] text-cyan-400">
                        🔗 关联监控: {item.linkedMonitor}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-8">
                  {selectedMonitor ? "该监控变量暂无关联反证条件" : "暂无反证条件数据"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
