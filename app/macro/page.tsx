"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, Target, History, Radar, TrendingUp, TrendingDown, 
  Minus, Activity, ArrowRight, Globe, Flag 
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
import { fetchMacroIndicatorsAbs, indexById, formatValue } from "@/lib/adapters/macroIndicators";
import { fetchCnMacroSnapshot, type CnMacroSnapshot } from "@/lib/api/macro-cn";

// Types
interface CounterSignal {
  condition: string;
  implication: string;
  action: string;
  linkedMonitor?: string;
  triggerType?: string;
  severity?: "high" | "medium" | "low";
}

interface RegimeData {
  region: string;
  status: string;
  updatedAt: string;
  regime: {
    name: string;
    confidence: number;
    driver: string;
    counterSignals: CounterSignal[];
    thresholds?: Record<string, number>;
    us_cn_comparison?: UsCnComparison;
  };
}

interface UsCnComparison {
  growth: { us: MacroDimension; cn: MacroDimension };
  inflation: { us: MacroDimension; cn: MacroDimension };
  policy: { us: MacroDimension; cn: MacroDimension };
  liquidity: { us: MacroDimension; cn: MacroDimension };
}

interface MacroDimension {
  status: string;
  trend: string;
  level: string;
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

interface YieldPoint {
  maturity: string;
  yield: number;
  change: number;
}

interface CnBondData {
  futures: BondFutureQuote[];
  yieldCurve: YieldPoint[] | null;
  source: string;
  status: "LIVE" | "DELAYED" | "STALE" | "OFF";
}

export default function MacroPage() {
  const [usById, setUsById] = useState<Record<string, { value: number | null; asOf: string | null; source: string }> | null>(null);
  const [cn, setCn] = useState<CnMacroSnapshot | null>(null);
  const [regime, setRegime] = useState<RegimeData | null>(null);
  const [history, setHistory] = useState<RegimeHistoryItem[]>([]);
  const [monitorItems, setMonitorItems] = useState<MonitorItem[]>([]);
  const [cnBondData, setCnBondData] = useState<CnBondData | null>(null);
  const [cnBondLoading, setCnBondLoading] = useState(true);
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const run = async () => {
      try {
        const origin = window.location.origin;
        const us = await fetchMacroIndicatorsAbs(origin);
        if (us) setUsById(indexById(us.indicators) as Record<string, { value: number | null; asOf: string | null; source: string }>);
      } catch {}

      try {
        const cnRes = await fetchCnMacroSnapshot();
        if (cnRes?.data) setCn(cnRes.data);
      } catch {}

      try {
        const res = await fetch("/api/macro-regime", { cache: "no-store" });
        const json = await res.json();
        if (json?.success && json?.data) setRegime(json.data);
      } catch {}

      try {
        const res = await fetch("/api/macro-history", { cache: "no-store" });
        const json = await res.json();
        if (json?.success && json?.data?.history) setHistory(json.data.history);
      } catch {}

      try {
        const res = await fetch("/api/macro-monitor", { cache: "no-store" });
        const json = await res.json();
        if (json?.success && json?.data?.items) setMonitorItems(json.data.items);
      } catch {}
    };
    run();
  }, []);

  useEffect(() => {
    const fetchCnBond = async () => {
      try {
        setCnBondLoading(true);
        const res = await fetch("/api/bond-cn?level=L2&fallback=true", { cache: "no-store" });
        const json = await res.json();
        if (json?.success) {
          setCnBondData({
            futures: json.data?.futures || [],
            yieldCurve: json.data?.yieldCurve?.yields || json.data?.yieldCurve || null,
            source: json.source || "Seed",
            status: json.status || "OFF",
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

  const curveSpread = useMemo(() => {
    const futures = cnBondData?.futures || [];
    const tFuture = futures.find(f => f.symbol.startsWith("T") && !f.symbol.startsWith("TS") && !f.symbol.startsWith("TL"));
    const tlFuture = futures.find(f => f.symbol.startsWith("TL"));
    if (tFuture && tlFuture) {
      return {
        spread: (tlFuture.price - tFuture.price).toFixed(2),
        tPrice: tFuture.price,
        tlPrice: tlFuture.price,
        tChange: tFuture.changePercent,
        tlChange: tlFuture.changePercent,
      };
    }
    return null;
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
      return { title: "流动性状态待观测", content: "国债期货数据加载中，暂无法判断流动性状态。", trend: "neutral" as const };
    }
    const curveSteepness = tlFuture.price - tFuture.price;
    const isSteepening = curveSteepness > 4.0;
    if (isSteepening) {
      return { title: "曲线陡峭化 · 长端承压", content: "30Y-10Y价差走阔，反映市场对长期通胀/增长预期升温，或久期需求减弱。", trend: "up" as const };
    } else {
      return { title: "曲线趋平 · 久期偏好", content: "30Y-10Y价差收窄，显示市场对长期利率下行预期增强，或配置型资金拉长久期。", trend: "down" as const };
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

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" /> 
            当前 Regime · {regime?.regime?.name || "Neutral"}
          </CardTitle>
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
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900/50 border border-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800">总览</TabsTrigger>
          <TabsTrigger value="us-cn" className="data-[state=active]:bg-slate-800">中美主轴</TabsTrigger>
          <TabsTrigger value="bonds" className="data-[state=active]:bg-slate-800">债券研究</TabsTrigger>
          <TabsTrigger value="signals" className="data-[state=active]:bg-slate-800">监控与反证</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: "增长 Growth", us: usById?.us_ism_pmi ? formatValue(usById.us_ism_pmi.value, "idx") : "—", cn: cn?.series?.pmi_mfg ? formatValue(cn.series.pmi_mfg.value, "idx") : "—", icon: TrendingUp },
              { title: "通胀 Inflation", us: usById?.us_cpi ? formatValue(usById.us_cpi.value, "%") : "—", cn: cn?.series?.cpi_yoy ? formatValue(cn.series.cpi_yoy.value, "%") : "—", icon: Activity },
              { title: "政策 Policy", us: usById?.us_fedfunds ? formatValue(usById.us_fedfunds.value, "%") : "—", cn: cn?.series?.lpr_1y ? formatValue(cn.series.lpr_1y.value, "%") : "—", icon: Target },
              { title: "流动性 Liquidity", us: usById?.us_10y ? formatValue(usById.us_10y.value, "%") : "—", cn: cn?.series?.m2_yoy ? formatValue(cn.series.m2_yoy.value, "%") : "—", icon: Globe },
            ].map((item) => (
              <Card key={item.title} className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-slate-400" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">🇺🇸</span>
                    <span className="text-slate-200 font-mono">{item.us}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">🇨🇳</span>
                    <span className="text-slate-200 font-mono">{item.cn}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-amber-500/50 transition-colors" onClick={() => setActiveTab("us-cn")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-amber-500" />
                  <span className="text-sm text-slate-200">中美宏观对比</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={() => setActiveTab("bonds")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm text-slate-200">中国债券研究</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-cyan-500/50 transition-colors" onClick={() => setActiveTab("signals")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Radar className="w-5 h-5 text-cyan-500" />
                  <span className="text-sm text-slate-200">监控与反证条件</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="us-cn" className="space-y-6 mt-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-500" />
                中美宏观周期对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Flag className="w-5 h-5 text-blue-500" />
                    <span className="text-lg font-medium text-slate-100">美国 United States</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "增长", value: usCnComparison?.growth?.us?.status || "soft_landing", level: usCnComparison?.growth?.us?.level },
                      { label: "通胀", value: usCnComparison?.inflation?.us?.status || "disinflation", level: usCnComparison?.inflation?.us?.level },
                      { label: "政策", value: usCnComparison?.policy?.us?.status || "restrictive", level: usCnComparison?.policy?.us?.level },
                      { label: "流动性", value: usCnComparison?.liquidity?.us?.status || "tightening", level: usCnComparison?.liquidity?.us?.level },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-2 bg-slate-950/50 rounded">
                        <span className="text-sm text-slate-400">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">{item.value}</Badge>
                          {item.level && <span className="text-xs text-slate-500">{item.level}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-slate-800">
                    <div className="text-xs text-slate-500 mb-2">关键指标</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-950/50 rounded p-2">
                        <div className="text-xs text-slate-500">ISM</div>
                        <div className="text-sm font-mono text-slate-200">{usById?.us_ism_pmi?.value?.toFixed(1) || "—"}</div>
                      </div>
                      <div className="bg-slate-950/50 rounded p-2">
                        <div className="text-xs text-slate-500">CPI</div>
                        <div className="text-sm font-mono text-slate-200">{usById?.us_cpi?.value?.toFixed(1) || "—"}%</div>
                      </div>
                      <div className="bg-slate-950/50 rounded p-2">
                        <div className="text-xs text-slate-500">10Y</div>
                        <div className="text-sm font-mono text-slate-200">{usById?.us_10y?.value?.toFixed(2) || "—"}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Flag className="w-5 h-5 text-red-500" />
                    <span className="text-lg font-medium text-slate-100">中国 China</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "增长", value: usCnComparison?.growth?.cn?.status || "weak_recovery", level: usCnComparison?.growth?.cn?.level },
                      { label: "通胀", value: usCnComparison?.inflation?.cn?.status || "low_inflation", level: usCnComparison?.inflation?.cn?.level },
                      { label: "政策", value: usCnComparison?.policy?.cn?.status || "accommodative", level: usCnComparison?.policy?.cn?.level },
                      { label: "流动性", value: usCnComparison?.liquidity?.cn?.status || "easing", level: usCnComparison?.liquidity?.cn?.level },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-2 bg-slate-950/50 rounded">
                        <span className="text-sm text-slate-400">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">{item.value}</Badge>
                          {item.level && <span className="text-xs text-slate-500">{item.level}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-slate-800">
                    <div className="text-xs text-slate-500 mb-2">关键指标</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-950/50 rounded p-2">
                        <div className="text-xs text-slate-500">PMI</div>
                        <div className="text-sm font-mono text-slate-200">{cn?.series?.pmi_mfg?.value?.toFixed(1) || "—"}</div>
                      </div>
                      <div className="bg-slate-950/50 rounded p-2">
                        <div className="text-xs text-slate-500">CPI</div>
                        <div className="text-sm font-mono text-slate-200">{cn?.series?.cpi_yoy?.value?.toFixed(1) || "—"}%</div>
                      </div>
                      <div className="bg-slate-950/50 rounded p-2">
                        <div className="text-xs text-slate-500">LPR</div>
                        <div className="text-sm font-mono text-slate-200">{cn?.series?.lpr_1y?.value?.toFixed(2) || "—"}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="text-sm font-medium text-slate-200 mb-3">周期错位分析</div>
                <div className="bg-slate-950/50 rounded-lg p-4 text-sm text-slate-400">
                  <p>美国处于<span className="text-blue-400">软着陆</span>预期阶段，通胀回落但就业韧性仍强，美联储维持限制性政策但降息预期仍在。</p>
                  <p className="mt-2">中国处于<span className="text-red-400">弱复苏</span>阶段，政策持续宽松但信用传导不畅，房地产风险仍待化解。</p>
                  <p className="mt-2 text-amber-400">周期错位意味着中美资产表现可能分化，需关注汇率与资本流动约束。</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonds" className="space-y-6 mt-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                中国债券研究层 / China Bond Research
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-200">国债期货主力合约</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${
                      cnBondData?.status === "LIVE" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                      cnBondData?.status === "DELAYED" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                      "bg-slate-700/50 text-slate-400 border-slate-600"
                    }`}>
                      {cnBondData?.status === "LIVE" ? "实时" : cnBondData?.status === "DELAYED" ? "延迟" : "Seed"}
                    </Badge>
                    <span className="text-[10px] text-slate-500">source: {cnBondData?.source || "—"}</span>
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
                        <div key={future.symbol} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
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

              {curveSpread && (
                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-200">期限利差监控 (TL-T)</h3>
                    <Badge variant="outline" className="text-xs border-slate-700">价差: {curveSpread.spread}元</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-900/50 rounded">
                      <div className="text-xs text-slate-500 mb-1">10Y 主力 (T)</div>
                      <div className="text-lg font-mono text-slate-200">{curveSpread.tPrice.toFixed(3)}</div>
                      <div className={`text-xs ${curveSpread.tChange >= 0 ? "text-red-400" : "text-green-400"}`}>
                        {curveSpread.tChange >= 0 ? "+" : ""}{curveSpread.tChange.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-slate-900/50 rounded">
                      <div className="text-xs text-slate-500 mb-1">30Y 主力 (TL)</div>
                      <div className="text-lg font-mono text-slate-200">{curveSpread.tlPrice.toFixed(3)}</div>
                      <div className={`text-xs ${curveSpread.tlChange >= 0 ? "text-red-400" : "text-green-400"}`}>
                        {curveSpread.tlChange >= 0 ? "+" : ""}{curveSpread.tlChange.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-200 mb-3">收益率曲线 / Yield Curve</h3>
                  {cnBondLoading ? (
                    <Skeleton className="h-48 bg-slate-800" />
                  ) : cnBondData?.yieldCurve && cnBondData.yieldCurve.length > 0 ? (
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
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <div className="text-[10px] text-slate-500">关键监控指标</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-[9px] bg-slate-800/50 text-slate-400 border-slate-700">DR007</Badge>
                        <Badge variant="outline" className="text-[9px] bg-slate-800/50 text-slate-400 border-slate-700">MLF</Badge>
                        <Badge variant="outline" className="text-[9px] bg-slate-800/50 text-slate-400 border-slate-700">社融增速</Badge>
                        <Badge variant="outline" className="text-[9px] bg-slate-800/50 text-slate-400 border-slate-700">期限利差</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
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
                        {item.category && <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{item.category}</Badge>}
                        <span className="text-sm font-medium text-slate-100">{item.name}</span>
                        {linkedSignals.length > 0 && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                            {linkedSignals.length} 个关联反证
                          </Badge>
                        )}
                      </div>
                      {item.current && <div className="text-xs text-cyan-300 mt-2">📊 当前：{item.current}</div>}
                      <div className="text-xs text-slate-400 mt-2">📌 {item.why}</div>
                      <div className="text-xs text-amber-300 mt-1">⚠️ {item.watch}</div>
                      {item.threshold && (
                        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                          {item.threshold.bullish && <div className="text-green-400">🟢 {item.threshold.bullish}</div>}
                          {item.threshold.neutral && <div className="text-slate-400">⚪ {item.threshold.neutral}</div>}
                          {item.threshold.bearish && <div className="text-red-400">🔴 {item.threshold.bearish}</div>}
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
                      {item.counterSignalsTriggered && item.counterSignalsTriggered.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.counterSignalsTriggered.map((sig, idx) => (
                            <Badge key={idx} variant="outline" className="text-[9px] border-red-500/30 text-red-400">
                              {sig}
                            </Badge>
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

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                反证条件 / Counter Signals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(regime?.regime?.counterSignals || []).length > 0 ? (
                regime?.regime?.counterSignals.map((item) => (
                  <div key={item.condition} className={`rounded-lg border p-3 text-sm space-y-2 ${
                    item.severity === "high" ? "border-red-900/50 bg-red-950/10" : 
                    item.severity === "medium" ? "border-amber-900/50 bg-amber-950/10" :
                    "border-slate-800 bg-slate-950/60"
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-200 font-medium">📌 {item.condition}</span>
                      {item.severity && (
                        <Badge variant="outline" className={`text-[10px] ${
                          item.severity === "high" ? "border-red-500/30 text-red-400" :
                          item.severity === "medium" ? "border-amber-500/30 text-amber-400" :
                          "border-slate-600 text-slate-400"
                        }`}>
                          {item.severity === "high" ? "高风险" : item.severity === "medium" ? "中风险" : "低风险"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-slate-400">🧭 {item.implication}</div>
                    <div className="text-amber-300">🎯 {item.action}</div>
                    {item.linkedMonitor && (
                      <div className="text-[10px] text-cyan-400">
                        🔗 关联监控: {item.linkedMonitor}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-8">暂无反证条件数据</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
