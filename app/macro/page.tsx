"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, ShieldAlert, Target, History, Radar, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
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

interface CounterSignal {
  condition: string;
  implication: string;
  action: string;
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
  };
}

interface RegimeHistoryItem {
  period: string;
  tag: string;
  summary: string;
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
}

// 中国债券数据类型
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
  const [cnFreshness, setCnFreshness] = useState<string | null>(null);
  const [regime, setRegime] = useState<RegimeData | null>(null);
  const [history, setHistory] = useState<RegimeHistoryItem[]>([]);
  const [monitorItems, setMonitorItems] = useState<MonitorItem[]>([]);
  
  // 中国债券数据状态
  const [cnBondData, setCnBondData] = useState<CnBondData | null>(null);
  const [cnBondLoading, setCnBondLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const origin = window.location.origin;
        const us = await fetchMacroIndicatorsAbs(origin);
        if (us) setUsById(indexById(us.indicators) as Record<string, { value: number | null; asOf: string | null; source: string }>);
      } catch {}

      try {
        const cnRes = await fetchCnMacroSnapshot();
        if (cnRes?.data) {
          setCn(cnRes.data);
          setCnFreshness(cnRes.freshness || null);
        }
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

  // 获取中国债券数据
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
    // 每5分钟刷新一次债券数据
    const interval = setInterval(fetchCnBond, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const dimensions = [
    {
      title: "增长 Growth",
      status: cn?.series?.unemployment_urban ? formatValue(cn.series.unemployment_urban.value, "%") : "中性偏弱",
      note: cn?.series?.unemployment_urban
        ? `CN 失业率 asOf ${cn.series.unemployment_urban.asOf || "-"}${cnFreshness === "STALE" ? " · STALE" : ""}`
        : "当前作为研究占位模块，待接中美真实宏观状态引擎。",
    },
    {
      title: "通胀 Inflation",
      status: cn?.series?.cpi_yoy ? formatValue(cn.series.cpi_yoy.value, "%") : (usById?.us_cpi ? formatValue(usById.us_cpi.value, "idx") : "回落观察"),
      note: cn?.series?.cpi_yoy
        ? `CN CPI asOf ${cn.series.cpi_yoy.asOf || "-"}${cnFreshness === "STALE" ? " · STALE" : ""}`
        : "后续接 CPI / PPI / 通胀预期与资产映射。",
    },
    {
      title: "政策 Policy",
      status: cn?.series?.lpr_1y ? formatValue(cn.series.lpr_1y.value, "%") : (usById?.us_fedfunds ? formatValue(usById.us_fedfunds.value, "%") : "等待细化"),
      note: cn?.series?.lpr_1y
        ? `CN LPR asOf ${cn.series.lpr_1y.asOf || "-"}${cnFreshness === "STALE" ? " · STALE" : ""}`
        : "后续接美联储 / 中国政策利率与政策偏向。",
    },
    {
      title: "流动性 Liquidity",
      status: cn?.series?.m2_yoy ? formatValue(cn.series.m2_yoy.value, "%") : (usById?.us_10y ? formatValue(usById.us_10y.value, "%") : "等待细化"),
      note: cn?.series?.m2_yoy
        ? `CN M2 asOf ${cn.series.m2_yoy.asOf || "-"}${cnFreshness === "STALE" ? " · STALE" : ""}`
        : "后续接信用脉冲、M2、收益率曲线与美元流动性。",
    },
  ];

  const regions = [
    {
      title: "🇺🇸 美国主轴",
      bullets: [
        `ISM: ${usById?.us_ism_pmi ? formatValue(usById.us_ism_pmi.value, "idx") : "—"}`,
        `Fed: ${usById?.us_fedfunds ? formatValue(usById.us_fedfunds.value, "%") : "—"}`,
        `10Y: ${usById?.us_10y ? formatValue(usById.us_10y.value, "%") : "—"}`,
      ],
    },
    {
      title: "🇨🇳 中国主轴",
      bullets: [
        `PMI: ${cn?.series?.pmi_mfg ? formatValue(cn.series.pmi_mfg.value, "idx") : "—"}`,
        `LPR: ${cn?.series?.lpr_1y ? formatValue(cn.series.lpr_1y.value, "%") : "—"}`,
        `社融: ${cn?.series?.social_financing?.value != null ? cn.series.social_financing.value.toFixed(4) + " 万亿" : "—"}`,
      ],
    },
  ];

  // 债券期货映射到期限
  const futureToMaturity: Record<string, string> = {
    "TS": "2Y",
    "TF": "5Y", 
    "T": "10Y",
    "TL": "30Y",
  };

  // 获取债券期货的期限标签
  const getMaturityLabel = (symbol: string): string => {
    const prefix = symbol.replace(/\d+$/, "");
    return futureToMaturity[prefix] || "—";
  };

  // 流动性解释文本生成
  const getLiquidityInterpretation = (): { title: string; content: string; trend: "up" | "down" | "neutral" } => {
    const futures = cnBondData?.futures || [];
    const tFuture = futures.find(f => f.symbol.startsWith("T") && !f.symbol.startsWith("TS") && !f.symbol.startsWith("TL"));
    const tlFuture = futures.find(f => f.symbol.startsWith("TL"));
    
    if (!tFuture || !tlFuture) {
      return { 
        title: "流动性状态待观测", 
        content: "国债期货数据加载中，暂无法判断流动性状态。建议关注央行MLF操作、银行间质押式回购利率（DR007）及社融增速变化。",
        trend: "neutral"
      };
    }

    const curveSteepness = tlFuture.price - tFuture.price;
    const isSteepening = curveSteepness > 4.0; // 30Y-10Y价差大于4元为陡峭
    
    if (isSteepening) {
      return {
        title: "曲线陡峭化 · 长端承压",
        content: "30Y-10Y价差走阔，反映市场对长期通胀/增长预期升温，或久期需求减弱。若陡峭化伴随长端利率上行，需关注负债端稳定性。建议监控：①超长债发行节奏 ②保险/银行配置行为 ③DR007偏离度。",
        trend: "up"
      };
    } else {
      return {
        title: "曲线趋平 · 久期偏好",
        content: "30Y-10Y价差收窄，显示市场对长期利率下行预期增强，或配置型资金拉长久期。若趋平伴随短端利率上行，需警惕资金利率向长端传导。建议监控：①央行逆回购净投放 ②理财/债基申赎 ③汇率对货币政策的约束。",
        trend: "down"
      };
    }
  };

  const liquidityInterp = getLiquidityInterpretation();

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="space-y-2">
        <div className="text-sm text-amber-400 font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Macro Research Hub
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-50">宏观研究中枢 / Macro Hub</h1>
        <p className="text-sm text-slate-400">🌍 已接入首页宏观数据骨架，后续继续增强 regime 判断与中美双主轴研究层。</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><Target className="w-5 h-5 text-amber-500" /> 当前 Regime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{regime?.regime?.name || "Neutral"}</Badge>
            <span>📊 置信度：{regime?.regime?.confidence ?? 50}%</span>
          </div>
          <div>🧭 核心驱动：{regime?.regime?.driver || "数据源恢复中，暂按中性基线显示"}</div>
          <div className="space-y-2">
            <div className="text-slate-400">⚠️ 反证条件：</div>
            {(regime?.regime?.counterSignals || []).length > 0 ? (
              (regime?.regime?.counterSignals || []).map((item) => (
                <div key={item.condition} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1">
                  <div className="text-slate-200">📌 条件：{item.condition}</div>
                  <div className="text-slate-400">🧭 含义：{item.implication}</div>
                  <div className="text-amber-300">🎯 动作：{item.action}</div>
                </div>
              ))
            ) : (
              ["等待更多数据验证", "中美主轴仍在恢复", "流动性链条仍需观察"].map((item) => (
                <div key={item} className="text-xs text-slate-400">• {item}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" /> 当前定位</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div>🎯 这里是宏观研究中枢，不是资讯页。</div>
          <div>📌 当前版本已打通首页现有宏观展示层数据；下一阶段继续补 regime 引擎、历史映射与反证条件。</div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {dimensions.map((item) => (
          <Card key={item.title} className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-100">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{item.status}</Badge>
              <div className="text-xs text-slate-400">{item.note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {regions.map((region) => (
          <Card key={region.title} className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">{region.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-300">
                {region.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 中国债券研究层 */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            🇨🇳 中国债券研究层 / China Bond Research
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 债券主力合约 */}
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
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24 bg-slate-800" />
                ))}
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

          {/* 收益率曲线 */}
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
                      <XAxis 
                        dataKey="maturity" 
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={{ stroke: '#334155' }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={{ stroke: '#334155' }}
                        domain={['dataMin - 0.1', 'dataMax + 0.1']}
                        tickFormatter={(v) => `${v.toFixed(2)}%`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          fontSize: '11px'
                        }}
                        formatter={(value) => [`${Number(value).toFixed(2)}%`, "收益率"]}
                      />
                      <ReferenceLine y={0} stroke="#334155" strokeDasharray="2 2" />
                      <Line 
                        type="monotone" 
                        dataKey="yield" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                      />
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

            {/* 流动性解释模块 */}
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

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><History className="w-5 h-5 text-cyan-400" /> 历史映射 / Historical Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          {history.length > 0 ? history.map((item) => (
            <div key={item.period} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{item.tag}</Badge>
                <span className="text-sm font-medium text-slate-100">{item.period}</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">{item.summary}</div>
            </div>
          )) : (
            <div className="text-xs text-slate-500">暂无历史映射数据</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><Radar className="w-5 h-5 text-emerald-400" /> 监控变量 / Monitor Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          {monitorItems.length > 0 ? monitorItems.map((item) => (
            <div key={item.name} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{item.region}</Badge>
                {item.category ? <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">{item.category}</Badge> : null}
                <span className="text-sm font-medium text-slate-100">{item.name}</span>
              </div>
              {item.current ? <div className="text-xs text-cyan-300 mt-2">📊 当前：{item.current}</div> : null}
              <div className="text-xs text-slate-400 mt-2">📌 {item.why}</div>
              <div className="text-xs text-amber-300 mt-1">⚠️ {item.watch}</div>
              {item.threshold ? (
                <div className="mt-2 grid gap-1 text-[11px] text-slate-500">
                  {item.threshold.bullish ? <div>🟢 bullish: {item.threshold.bullish}</div> : null}
                  {item.threshold.neutral ? <div>⚪ neutral: {item.threshold.neutral}</div> : null}
                  {item.threshold.bearish ? <div>🔴 bearish: {item.threshold.bearish}</div> : null}
                </div>
              ) : null}
            </div>
          )) : (
            <div className="text-xs text-slate-500">暂无监控变量</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
