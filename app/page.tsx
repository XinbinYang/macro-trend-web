"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ArrowUpRight, ArrowDownRight, Gauge, Clock, TrendingUp, ChevronDown, ChevronUp, Zap, ZapOff } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import { MacroDashboard } from "@/components/macro-gauge";

// === Types ===
interface Regime { name: "Risk-ON" | "Risk-OFF" | "Neutral"; confidence: number; driver: string; score: number }
type State = "strong" | "weak" | "neutral" | "unknown";
type Trend = "improving" | "deteriorating" | "stable" | "unknown";
type Unit = "%" | "idx" | "level";

interface DimOutput {
  dim: "growth" | "inflation" | "policy" | "liquidity";
  name: string;
  us: { value: number | null; unit: Unit; asOf: string | null; state: State; trend: Trend; note: string; stale: boolean; source: string };
  cn: { value: number | null; unit: Unit; asOf: string | null; state: State; trend: Trend; note: string; stale: boolean; source: string };
}

interface MacroState {
  updatedAt: string;
  regime: Regime;
  dimensions: DimOutput[];
}

interface NavPoint { date: string; value: number }
interface NavMetrics { cagr: number | null; vol: number | null; maxDrawdown: number | null; sharpe: number | null }

interface WatchlistItem { symbol: string; name: string; category: string }

interface PolicyLiquidity {
  us: { policy: DimOutput["us"]; liquidity: DimOutput["us"] };
  cn: { policy: DimOutput["cn"]; liquidity: DimOutput["cn"] };
}

interface DashboardData {
  success: boolean;
  latency: number;
  timestamp: string;
  macroState: MacroState;
  nav: { status: string; asOf: string; nav: NavPoint[]; metrics: NavMetrics | null };
  watchlist: { us: WatchlistItem[]; cn: WatchlistItem[]; hk: WatchlistItem[]; global: WatchlistItem[] };
  macroDimensions: Record<string, { name: string; emoji: string }>;
  policyLiquidity: PolicyLiquidity;
}

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  source: string;
  region?: "US" | "CN" | "HK" | "GLOBAL" | string;
  dataType: "REALTIME" | "DELAYED" | "EOD";
  dataSource: string;
}

// === Components ===

function DataTypeBadge({ type }: { type: string }) {
  const configs = {
    REALTIME: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "实时" },
    DELAYED: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "延迟" },
    EOD: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "收盘" },
  };
  const config = configs[type as keyof typeof configs] || configs.EOD;
  return (
    <Badge variant="outline" className={`text-[9px] ${config.color}`}>
      <Clock className="w-2.5 h-2.5 mr-0.5" />
      {config.label}
    </Badge>
  );
}

function RegionIcon({ region }: { region: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    US: { bg: "bg-blue-500", label: "US" },
    CN: { bg: "bg-red-500", label: "CN" },
    HK: { bg: "bg-purple-500", label: "HK" },
    GLOBAL: { bg: "bg-green-500", label: "GL" },
  };
  const { bg, label } = config[region] || { bg: "bg-slate-500", label: "??" };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold text-white ${bg}`}>
      {label}
    </span>
  );
}

function AssetCard({ quote, compact = false }: { quote: MarketQuote; compact?: boolean }) {
  const isPositive = quote.change >= 0;
  return (
    <Link href={`/assets/${encodeURIComponent(quote.symbol)}`} className="block">
      <Card className={`bg-slate-900/50 border-slate-800 transition-all hover:border-slate-700 hover:bg-slate-800/50 ${compact ? 'p-2' : 'p-3'}`}>
        <CardContent className={compact ? "p-2" : "p-3"}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <RegionIcon region={quote.region || (quote.dataSource === "OFF" ? "GLOBAL" : "US")} />
              <span className="text-[10px] text-slate-400 truncate max-w-[50px]">{quote.name}</span>
            </div>
            <DataTypeBadge type={quote.dataType} />
          </div>
          <div className={`font-bold ${compact ? 'text-sm' : 'text-lg'} text-slate-50`}>
            {quote.price && quote.price > 0 ? quote.price.toFixed(quote.price < 10 ? 3 : 2) : "—"}
          </div>
          <div className={`flex items-center text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {quote.price && quote.price > 0 ? `${isPositive ? "+" : ""}${quote.changePercent.toFixed(2)}%` : "—"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// === Main Page ===

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [marketData, setMarketData] = useState<{ us: MarketQuote[]; cn: MarketQuote[]; hk: MarketQuote[]; global: MarketQuote[] } | null>(null);
  // Market data status is intentionally not stored in state (avoid client-side hard fails).
  // If you want a UI badge later, re-introduce a state and surface it in the header.
  const [regionView, setRegionView] = useState<"US" | "CN">("US");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Single API call for dashboard data
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const data: DashboardData = await res.json();
      if (data.success) setDashboardData(data);

      // Market data (still separate - heavy real-time data)
      const mktRes = await fetch("/api/market-data-realtime", { cache: "no-store" });
      const mktData = await mktRes.json();
      if (mktData?.success) {
        const d = mktData.data || {};
        // Defensive aliasing: tolerate legacy keys (china/hongkong)
        setMarketData({
          us: Array.isArray(d.us) ? d.us : [],
          cn: Array.isArray(d.cn) ? d.cn : Array.isArray(d.china) ? d.china : [],
          hk: Array.isArray(d.hk) ? d.hk : Array.isArray(d.hongkong) ? d.hongkong : [],
          global: Array.isArray(d.global) ? d.global : [],
        });
      } else {
        setMarketData({ us: [], cn: [], hk: [], global: [] });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const macroState = dashboardData?.macroState;
  const nav = dashboardData?.nav;
  const regime = macroState?.regime;
  const dims = macroState?.dimensions || [];
  const policyLiquidity = dashboardData?.policyLiquidity;

  // Helper to format dim value
  const fmtDim = (v: number | null, unit: Unit) => {
    if (v === null) return "—";
    if (unit === "%") return `${v.toFixed(2)}%`;
    return v.toFixed(2);
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-4 md:p-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2NGgtNHpNMjAgMjBoNHY0aC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

        <div className="relative">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="status-dot status-dot-green animate-pulse"></span>
                <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Market Live</span>
              </div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-serif font-bold text-slate-50">
                全球宏观投资仪表盘
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                AI驱动的多维度市场分析 · {dashboardData?.timestamp ? new Date(dashboardData.timestamp).toLocaleString() : '实时更新'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800/80 rounded-lg p-1 border border-slate-700">
                <button onClick={() => setRegionView("US")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${regionView === "US" ? "bg-blue-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}>
                  🇺🇸 美国
                </button>
                <button onClick={() => setRegionView("CN")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${regionView === "CN" ? "bg-red-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}>
                  🇨🇳 中国
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                刷新
              </Button>
            </div>
          </div>

          {/* Macro Regime Strip */}
          {regime && (
            <div className={`mb-4 px-4 py-3 rounded-xl border flex items-center justify-between gap-4 ${
              regime.name === "Risk-ON" ? "bg-green-500/10 border-green-500/30" :
              regime.name === "Risk-OFF" ? "bg-red-500/10 border-red-500/30" :
              "bg-amber-500/10 border-amber-500/30"
            }`}>
              <div className="flex items-center gap-3">
                {regime.name === "Risk-ON" ? <Zap className="w-5 h-5 text-green-400" /> :
                 regime.name === "Risk-OFF" ? <ZapOff className="w-5 h-5 text-red-400" /> :
                 <Gauge className="w-5 h-5 text-amber-400" />}
                <div>
                  <span className={`text-sm font-bold ${
                    regime.name === "Risk-ON" ? "text-green-400" :
                    regime.name === "Risk-OFF" ? "text-red-400" : "text-amber-400"
                  }`}>{regime.name}</span>
                  <span className="text-xs text-slate-400 ml-2">宏观格局</span>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-slate-500">置信度</span>
                <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${regime.confidence}%` }} />
                </div>
                <span className="text-xs text-amber-400 font-medium">{regime.confidence}%</span>
              </div>
              <div className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-none">{regime.driver}</div>
            </div>
          )}

          {/* 4 Quadrants: Growth × Inflation */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {dims.map((dim) => {
              const stateDim = dim;
              const statePoint = regionView === "US" ? stateDim.us : stateDim.cn;
              const isExpanded = expandedCards[dim.dim];

              return (
                <div key={dim.dim} className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-2 transition-all ${isExpanded ? 'ring-1 ring-amber-500/50' : 'hover:border-slate-600'}`}>
                  <button onClick={() => setExpandedCards(prev => ({ ...prev, [dim.dim]: !prev[dim.dim] }))} className="w-full text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-green-300 border-green-500/30 bg-green-500/10">LIVE</span>
                      <span className="text-[9px] text-slate-500">{dim.name}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{dashboardData?.macroDimensions?.[dim.dim]?.emoji || "📊"}</span>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${
                          statePoint.state === 'strong' ? 'bg-green-400' :
                          statePoint.state === 'weak' ? 'bg-red-400' : 'bg-amber-400'
                        }`}></span>
                        <span className={`text-sm font-bold ${
                          statePoint.state === 'strong' ? 'text-green-400' :
                          statePoint.state === 'weak' ? 'text-red-400' : 'text-amber-400'
                        }`}>{fmtDim(statePoint.value, statePoint.unit)}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{statePoint.note}</div>
                    <div className="flex justify-center mt-1 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 text-[10px] text-slate-400 space-y-1">
                      <div>asOf: {statePoint.asOf || "—"}</div>
                      <div>source: {statePoint.source}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Policy × Liquidity Verification Strip */}
          {policyLiquidity && (
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="text-xs text-slate-400 mr-2">政策×流动性验证:</div>
              {regionView === "US" ? (
                <>
                  <Badge variant="outline" className="text-[10px] bg-slate-800/50 border-slate-700">
                    政策: {fmtDim(policyLiquidity.us.policy?.value ?? null, policyLiquidity.us.policy?.unit || "%")}
                    <span className={`ml-1 ${policyLiquidity.us.policy?.state === 'strong' ? 'text-green-400' : policyLiquidity.us.policy?.state === 'weak' ? 'text-red-400' : 'text-amber-400'}`}>●</span>
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-slate-800/50 border-slate-700">
                    流动性: {fmtDim(policyLiquidity.us.liquidity?.value ?? null, policyLiquidity.us.liquidity?.unit || "%")}
                    <span className={`ml-1 ${policyLiquidity.us.liquidity?.state === 'strong' ? 'text-green-400' : policyLiquidity.us.liquidity?.state === 'weak' ? 'text-red-400' : 'text-amber-400'}`}>●</span>
                  </Badge>
                </>
              ) : (
                <>
                  <Badge variant="outline" className="text-[10px] bg-slate-800/50 border-slate-700">
                    政策: {fmtDim(policyLiquidity.cn.policy?.value ?? null, policyLiquidity.cn.policy?.unit || "%")}
                    <span className={`ml-1 ${policyLiquidity.cn.policy?.state === 'strong' ? 'text-green-400' : policyLiquidity.cn.policy?.state === 'weak' ? 'text-red-400' : 'text-amber-400'}`}>●</span>
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-slate-800/50 border-slate-700">
                    流动性: {fmtDim(policyLiquidity.cn.liquidity?.value ?? null, policyLiquidity.cn.liquidity?.unit || "%")}
                    <span className={`ml-1 ${policyLiquidity.cn.liquidity?.state === 'strong' ? 'text-green-400' : policyLiquidity.cn.liquidity?.state === 'weak' ? 'text-red-400' : 'text-amber-400'}`}>●</span>
                  </Badge>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Data Layer Declaration */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-3 md:p-4 text-xs text-slate-400 space-y-2">
          <div className="flex items-start gap-2">
            <StatusBadge status="LIVE" note="Indicative" title="展示层数据" />
            <div><span className="text-slate-200 font-medium">展示层</span>：实时行情用于监控，不得用于回测。</div>
          </div>
          <div className="flex items-start gap-2">
            <StatusBadge status="LIVE" note="Truth" title="真值层数据" />
            <div><span className="text-slate-200 font-medium">真值层</span>：仅 Master + 官方结算镜像。</div>
          </div>
        </CardContent>
      </Card>

      {/* Watchlist: Core 24 Items */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">⭐ 核心 Watchlist (24)</Badge>
          <span className="text-xs text-slate-500">配置化 · 可自定义</span>
        </div>

        {/* US */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">🇺🇸 美国</Badge>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {loading ? [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 bg-slate-800" />) : (
              marketData?.us.slice(0, 6).map((q: MarketQuote) => <AssetCard key={q.symbol} quote={q} compact />)
            )}
          </div>
        </div>

        {/* CN */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🇨🇳 中国</Badge>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-20 bg-slate-800" />) : (
              marketData?.cn.slice(0, 4).map((q: MarketQuote) => <AssetCard key={q.symbol} quote={q} compact />)
            )}
          </div>
        </div>

        {/* HK + Global */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">🇭🇰 香港</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {loading ? [1,2].map(i => <Skeleton key={i} className="h-20 bg-slate-800" />) : (
                marketData?.hk.slice(0, 2).map((q: MarketQuote) => <AssetCard key={q.symbol} quote={q} compact />)
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🌍 全球</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {loading ? [1,2].map(i => <Skeleton key={i} className="h-20 bg-slate-800" />) : (
                marketData?.global.slice(0, 2).map((q: MarketQuote) => <AssetCard key={q.symbol} quote={q} compact />)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NAV Chart */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base md:text-lg flex items-center gap-2 text-slate-100">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                策略净值追踪
              </CardTitle>
              <div className="flex items-center gap-2">
                {nav?.status === "LIVE" && <Badge variant="outline" className="text-[10px] bg-green-500/10 border-green-500/30 text-green-400">LIVE · {nav.asOf}</Badge>}
                {nav?.status === "SAMPLE" && <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-400">SAMPLE · {nav.asOf}</Badge>}
                {nav?.status === "OFFLINE" && <Badge variant="outline" className="text-[10px] bg-red-500/10 border-red-500/30 text-red-400">OFFLINE</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading || nav?.nav.length === 0 ? (
              <div className="h-[250px] md:h-[320px] flex items-center justify-center">
                {loading ? <RefreshCw className="w-6 h-6 animate-spin text-slate-500" /> : <p className="text-slate-500">暂无数据</p>}
              </div>
            ) : (
              <div className="h-[250px] md:h-[320px]">
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart data={nav?.nav || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tickFormatter={(v) => String(v || "").slice(0, 7)} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(2)} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} formatter={(v) => typeof v === 'number' ? v.toFixed(4) : v} />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} name="中美全天候Beta" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Metrics */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-100">风险收益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">CAGR</div>
                <div className="text-lg font-bold text-slate-50">{nav?.metrics?.cagr == null ? "—" : `${(nav.metrics.cagr * 100).toFixed(2)}%`}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">波动率</div>
                <div className="text-lg font-bold text-slate-50">{nav?.metrics?.vol == null ? "—" : `${(nav.metrics.vol * 100).toFixed(2)}%`}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">最大回撤</div>
                <div className="text-lg font-bold text-slate-50">{nav?.metrics?.maxDrawdown == null ? "—" : `${(nav.metrics.maxDrawdown * 100).toFixed(2)}%`}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">夏普</div>
                <div className="text-lg font-bold text-slate-50">{nav?.metrics?.sharpe == null ? "—" : nav.metrics.sharpe.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Macro Dashboard */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg flex items-center gap-2 text-slate-100">
            <Gauge className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
            宏观指标监控
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MacroDashboard />
        </CardContent>
      </Card>
    </div>
  );
}
