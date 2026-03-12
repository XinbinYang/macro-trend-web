"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ArrowUpRight, ArrowDownRight, Sparkles, CandlestickChart, Gauge, Clock, TrendingUp, BookOpen, ChevronDown, ChevronUp, Zap, ZapOff } from "lucide-react";
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
import { fetchMacroIndicatorsAbs, indexById, formatValue } from "@/lib/adapters/macroIndicators";

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
  region: "US" | "CN" | "HK" | "GLOBAL";
  category: "EQUITY" | "BOND" | "COMMODITY" | "FX";
  dataType: "REALTIME" | "DELAYED" | "EOD";
  dataSource: string;
}

interface MarketData {
  success: boolean;
  sources: Record<string, number>;
  dataTypes: Record<string, number>;
  timestamp: string;
  data: {
    us: MarketQuote[];
    china: MarketQuote[];
    hongkong: MarketQuote[];
    global: MarketQuote[];
  };
  bond?: {
    china?: {
      futures?: MarketQuote[];
      yieldCurve?: { maturity: string; yield: number; change: number }[];
      source?: string;
    };
  };
  disclaimer?: {
    indicative?: string;
    truth?: string;
  };
}

interface StrategyNavPoint {
  date: string;
  "Beta 7.0": number;
  "Alpha 2.0": number;
  "5:5 Mix": number;
  "7:3 Mix": number;
}

interface NewsItem {
  id: string;
  time: string;
  title: string;
  titleEn?: string;
  content?: string;
  source: string;
  url?: string;
}

// 数据类型标签
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

// 资讯组件
function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setNews(data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg flex items-center gap-2 text-slate-100">
          <CandlestickChart className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
          最新资讯
          {loading && <span className="text-xs text-slate-500">加载中...</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {news.length > 0 ? (
            news.map((item) => (
              <a
                key={item.id}
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="text-xs text-slate-500 min-w-[40px]">{item.time}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">{item.title}</div>
                  {item.titleEn && (
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{item.titleEn}</div>
                  )}
                  <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                    来源: {item.source}
                    {item.url && <span className="text-amber-500">↗</span>}
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="text-center py-4 text-slate-500 text-sm">
              暂无最新资讯
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 资产卡片组件
// 地区图标组件 - 使用简单的div+文字，避免SVG兼容性问题
function RegionIcon({ region }: { region: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    US: { bg: "bg-blue-500", label: "US" },
    CN: { bg: "bg-red-500", label: "CN" },
    HK: { bg: "bg-purple-500", label: "HK" },
    GLOBAL: { bg: "bg-green-500", label: "GL" },
  };

  const { bg, label } = config[region] || { bg: "bg-slate-500", label: "??" };

  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold text-white ${bg}`}>
      {label}
    </span>
  );
}

function AssetCard({ quote }: { quote: MarketQuote }) {
  const isPositive = quote.change >= 0;

  const href = `/assets/${encodeURIComponent(quote.symbol)}`;

  return (
    <Link href={href} className="block">
      <Card
        className="bg-slate-900/50 border-slate-800 transition-all hover:border-slate-700 hover:bg-slate-800/50"
      >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <RegionIcon region={quote.region} />
            <span className="text-xs text-slate-400 truncate max-w-[60px]">{quote.name}</span>
          </div>
          <DataTypeBadge type={quote.dataType} />
        </div>
        <div className="text-lg font-bold text-slate-50">
          {quote.price && quote.price > 0 ? quote.price.toFixed(quote.price < 10 ? 3 : 2) : "—"}
        </div>
        <div className={`flex items-center mt-1 text-xs font-medium ${
          isPositive ? "text-green-400" : "text-red-400"
        }`}>
          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
          {quote.price && quote.price > 0 ? `${isPositive ? "+" : ""}${quote.changePercent.toFixed(2)}%` : "—"}
        </div>
        <div className="text-[9px] text-slate-600 mt-1 truncate">
          {quote.dataSource}
        </div>
        <div className="mt-1">
          <StatusBadge
            status={quote.dataSource === "OFF" ? "OFF" : quote.dataSource === "SAMPLE" ? "SAMPLE" : quote.dataSource === "MOCK" ? "MOCK" : "LIVE"}
            note={quote.dataType === "REALTIME" ? "RT" : quote.dataType === "EOD" ? "EOD" : "DLY"}
            title={quote.source}
          />
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}

// 四大宏观维度配置
// NOTE: 当前维度结论与"依据小字"尚未接入可审计数据源，必须按 SAMPLE 标注，避免误导。
const macroDimensions = [
  {
    id: "growth",
    name: "增长预期",
    emoji: "📈",
    china: { status: "-", trend: "neutral", desc: "-" },
    us: { status: "-", trend: "neutral", desc: "-" },
  },
  {
    id: "inflation",
    name: "通胀预期",
    emoji: "🔥",
    china: { status: "-", trend: "neutral", desc: "-" },
    us: { status: "-", trend: "neutral", desc: "-" },
  },
  {
    id: "policy",
    name: "政策预期",
    emoji: "🏛️",
    china: { status: "-", trend: "neutral", desc: "-" },
    us: { status: "-", trend: "neutral", desc: "-" },
  },
  {
    id: "liquidity",
    name: "流动性",
    emoji: "💧",
    china: { status: "-", trend: "neutral", desc: "-" },
    us: { status: "-", trend: "neutral", desc: "-" },
  },
];

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("beta-7-0");
  const [strategyNavData, setStrategyNavData] = useState<StrategyNavPoint[]>([]);
  const [navStatus, setNavStatus] = useState<"LOADING" | "SAMPLE" | "OFFLINE" | "LIVE">("LOADING");
  const [navAsOf, setNavAsOf] = useState<string>("");
  const [navMetrics, setNavMetrics] = useState<{ cagr: number | null; vol: number | null; maxDrawdown: number | null; sharpe: number | null } | null>(null);

  // US/CN toggle for macro overview
  const [regionView, setRegionView] = useState<"US" | "CN">("US");

  // Macro regime strip state (static for now - can be connected to API later)
  const [macroRegime] = useState<{
    status: "Risk-ON" | "Risk-OFF" | "Neutral";
    confidence: number;
    driver: string;
  }>({
    status: "Neutral",
    confidence: 0,
    driver: "-"
  });

  // Expandable state for macro cards
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Macro indicators (US/FRED) - evidence source for macro cards
  const [macroIndicators, setMacroIndicators] = useState<{
    updatedAt: string;
    byId: Record<string, { id: string; name: string; unit: string; value: number | null; status: "LIVE" | "OFF"; asOf: string | null; source: string }>;
  } | null>(null);
  const [macroIndicatorsStatus, setMacroIndicatorsStatus] = useState<"LOADING" | "LIVE" | "OFF" | "ERROR">("LOADING");

  // China macro snapshot (monthly) - AkShare artifact via /api/macro-cn
  const [cnMacro, setCnMacro] = useState<{
    region: "CN";
    status: "LIVE" | "OFF";
    updatedAt: string;
    asOf: string | null;
    series: {
      cpi_yoy: { value: number | null; asOf: string | null; source: string };
      unemployment_urban: { value: number | null; asOf: string | null; source: string };
    };
  } | null>(null);
  const [cnMacroStatus, setCnMacroStatus] = useState<"LOADING" | "LIVE" | "OFF" | "ERROR">("LOADING");

  // AI 最新点评（展示层）
  const [latestAI, setLatestAI] = useState<{ title: string; summary: string; impact?: string; suggestion?: string; createdAt?: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/market-data-realtime");
      const data: MarketData = await res.json();
      if (data.success) setMarketData(data);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh dashboard snapshot (fast line)
    const interval = setInterval(fetchData, 60_000);

    // Fetch US macro indicators from same-origin absolute URL (serverless)
    const fetchMacro = async () => {
      try {
        setMacroIndicatorsStatus("LOADING");
        const origin = window.location.origin;
        const res = await fetchMacroIndicatorsAbs(origin);
        if (!res) {
          setMacroIndicatorsStatus("OFF");
          return;
        }
        const byId = indexById(res.indicators);
        setMacroIndicators({ updatedAt: res.updatedAt, byId });
        setMacroIndicatorsStatus("LIVE");
      } catch (e) {
        console.error("[MacroIndicators][US] fetch failed", e);
        setMacroIndicatorsStatus("ERROR");
      }
    };

    // Fetch CN macro snapshot (monthly)
    const fetchCnMacro = async () => {
      try {
        setCnMacroStatus("LOADING");
        const res = await fetch("/api/macro-cn", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!json?.success || !json?.data) {
          setCnMacro(null);
          setCnMacroStatus("OFF");
          return;
        }
        setCnMacro(json.data);
        setCnMacroStatus(json.data.status === "LIVE" ? "LIVE" : "OFF");
      } catch (e) {
        console.error("[MacroIndicators][CN] fetch failed", e);
        setCnMacro(null);
        setCnMacroStatus("ERROR");
      }
    };

    fetchMacro();
    fetchCnMacro();

    // Macro indicators are monthly-ish. Keep refresh daily to reduce noise/cost.
    const macroInterval = setInterval(fetchMacro, 24 * 60 * 60_000);
    const cnMacroInterval = setInterval(fetchCnMacro, 24 * 60 * 60_000);

    return () => {
      clearInterval(interval);
      clearInterval(macroInterval);
      clearInterval(cnMacroInterval);
    };
  }, []);

  const fetchLatestAI = async () => {
    setAiLoading(true);
    try {
      const spx = marketData?.data.us?.find(q => q.symbol === "^GSPC");
      const ndx = marketData?.data.us?.find(q => q.symbol === "^NDX");
      const dji = marketData?.data.us?.find(q => q.symbol === "^DJI");

      const y2 = marketData?.data.us?.find(q => q.symbol === "US2Y");
      const y10 = marketData?.data.us?.find(q => q.symbol === "US10Y");
      const y30 = marketData?.data.us?.find(q => q.symbol === "US30Y");

      const slope = (y10 && y2) ? (y10.price - y2.price) : null;

      const title = "AI 最新点评（Indicative）";
      const summary = [
        `股指：${spx ? `${spx.name} ${spx.changePercent.toFixed(2)}%` : "SPX -"} / ${ndx ? `${ndx.name} ${ndx.changePercent.toFixed(2)}%` : "NDX -"} / ${dji ? `${dji.name} ${dji.changePercent.toFixed(2)}%` : "DJI -"}`,
        `利率：2Y ${y2 ? y2.price.toFixed(2) : "-"}% · 10Y ${y10 ? y10.price.toFixed(2) : "-"}% · 30Y ${y30 ? y30.price.toFixed(2) : "-"}%` + (slope !== null ? ` · 10Y-2Y ${slope.toFixed(2)}%` : ""),
        `结论：优先盯"曲线斜率 + 科技相对强弱"，它们决定风险偏好与久期方向。`,
      ].join("\n");

      setLatestAI({ title, summary, createdAt: new Date().toISOString() });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    // Load once after first market snapshot arrives
    if (marketData?.success && !latestAI && !aiLoading) {
      fetchLatestAI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketData?.timestamp]);

  // Fetch strategy NAV from API (truth layer) - replaces random generation
  useEffect(() => {
    const fetchNav = async () => {
      try {
        const res = await fetch('/api/nav?strategy=beta70');
        const json = await res.json();
        
        if (json.success && json.data?.nav) {
          // Transform API response to StrategyNavPoint format
          const navPoints = json.data.nav.map((item: { date: string; value: number }) => ({
            date: item.date,
            "中美全天候Beta": item.value,
          }));
          
          setStrategyNavData(navPoints);
          setNavAsOf(json.data.asOf || "");
          setNavMetrics(json.data.metrics || null);
          setNavStatus(json.data.status === "SAMPLE" ? "SAMPLE" : "LIVE");
        } else {
          setStrategyNavData([]);
          setNavStatus("OFFLINE");
        }
      } catch (error) {
        console.error("Failed to fetch NAV:", error);
        setStrategyNavData([]);
        setNavStatus("OFFLINE");
      }
    };

    fetchNav();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-4 md:p-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2NGgtNHpNMjAgMjBoNHY0aC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

        <div className="relative">
          {/* Top Row: Title + Toggle */}
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
                AI驱动的多维度市场分析 · {marketData?.timestamp ? new Date(marketData.timestamp).toLocaleString() : '实时更新'}
              </p>
            </div>

            {/* US/CN Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800/80 rounded-lg p-1 border border-slate-700">
                <button
                  onClick={() => setRegionView("US")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    regionView === "US"
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🇺🇸 美国
                </button>
                <button
                  onClick={() => setRegionView("CN")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    regionView === "CN"
                      ? "bg-red-500 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🇨🇳 中国
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
                className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                刷新
              </Button>
            </div>
          </div>

          {/* Macro Regime Summary Strip */}
          <div className={`mb-4 px-4 py-3 rounded-xl border flex items-center justify-between gap-4 ${
            macroRegime.status === "Risk-ON"
              ? "bg-green-500/10 border-green-500/30"
              : macroRegime.status === "Risk-OFF"
              ? "bg-red-500/10 border-red-500/30"
              : "bg-amber-500/10 border-amber-500/30"
          }`}>
            <div className="flex items-center gap-3">
              {macroRegime.status === "Risk-ON" ? (
                <Zap className="w-5 h-5 text-green-400" />
              ) : macroRegime.status === "Risk-OFF" ? (
                <ZapOff className="w-5 h-5 text-red-400" />
              ) : (
                <Gauge className="w-5 h-5 text-amber-400" />
              )}
              <div>
                <span className={`text-sm font-bold ${
                  macroRegime.status === "Risk-ON"
                    ? "text-green-400"
                    : macroRegime.status === "Risk-OFF"
                    ? "text-red-400"
                    : "text-amber-400"
                }`}>
                  {macroRegime.status}
                </span>
                <span className="text-xs text-slate-400 ml-2">宏观格局</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs text-slate-500">置信度</span>
              <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${macroRegime.confidence}%` }}
                />
              </div>
              <span className="text-xs text-amber-400 font-medium">{macroRegime.confidence}%</span>
            </div>
            <div className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-none">
              {macroRegime.driver}
            </div>
          </div>

          {/* 四大宏观维度 - Signal Light Style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {macroDimensions.map((dim) => {
              const currentBase = regionView === "US" ? dim.us : dim.china;
              const byId = macroIndicators?.byId;

              // Map indicators
              // US -> FRED
              const dimToIndicatorIdUS: Record<string, string> = {
                growth: "us_unrate",
                inflation: "us_cpi",
                policy: "us_fedfunds",
                liquidity: "us_10y",
              };

              // CN -> AkShare monthly snapshot
              const cnValueMap: Record<string, { label: string; value: number | null; unit: string; asOf: string | null; source: string } | null> = {
                growth: cnMacro
                  ? {
                      label: "中国城镇调查失业率",
                      value: cnMacro.series.unemployment_urban.value,
                      unit: "%",
                      asOf: cnMacro.series.unemployment_urban.asOf,
                      source: cnMacro.series.unemployment_urban.source,
                    }
                  : null,
                inflation: cnMacro
                  ? {
                      label: "中国CPI同比",
                      value: cnMacro.series.cpi_yoy.value,
                      unit: "%",
                      asOf: cnMacro.series.cpi_yoy.asOf,
                      source: cnMacro.series.cpi_yoy.source,
                    }
                  : null,
                policy: null,
                liquidity: null,
              };

              const indUS = regionView === "US" && byId ? byId[dimToIndicatorIdUS[dim.id]] : null;
              const indCN = regionView === "CN" ? cnValueMap[dim.id] : null;

              const current =
                regionView === "CN"
                  ? indCN
                    ? {
                        status: formatValue(indCN.value, indCN.unit),
                        trend: "neutral" as const,
                        desc: `${indCN.label}: ${formatValue(indCN.value, indCN.unit)} · asOf ${indCN.asOf || "-"} · ${indCN.source}`,
                      }
                    : {
                        status: cnMacroStatus === "OFF" ? "OFF" : "—",
                        trend: "neutral" as const,
                        desc: cnMacroStatus === "OFF" ? "CN source: OFF (monthly snapshot missing)" : "CN source: LOADING",
                      }
                  : indUS && indUS.status === "LIVE"
                    ? {
                        status: formatValue(indUS.value, indUS.unit),
                        trend: "neutral" as const,
                        desc: `${indUS.name}: ${formatValue(indUS.value, indUS.unit)} · asOf ${indUS.asOf || "-"} · ${indUS.source}`,
                      }
                    : currentBase;
              const isExpanded = expandedCards[dim.id];
              return (
                <div
                  key={dim.id}
                  className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-3 transition-all ${
                    isExpanded ? 'ring-1 ring-amber-500/50' : 'hover:border-slate-600'
                  }`}
                >
                  {/* Compact Header: Status + Top 2 Evidence */}
                  <button
                    onClick={() => setExpandedCards(prev => ({ ...prev, [dim.id]: !prev[dim.id] }))}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      {macroIndicatorsStatus === "LIVE" ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-green-300 border-green-500/30 bg-green-500/10">
                          LIVE
                        </span>
                      ) : macroIndicatorsStatus === "ERROR" ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-red-300 border-red-500/30 bg-red-500/10">
                          ERROR
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-amber-300 border-amber-500/30 bg-amber-500/10">
                          SAMPLE
                        </span>
                      )}
                      <span className="text-[9px] text-slate-500">
                        {macroIndicators
                          ? `source: FRED · updated ${new Date(macroIndicators.updatedAt).toLocaleDateString()}`
                          : "未接入可审计宏观指标"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{dim.emoji}</span>
                        <span className="text-xs font-medium text-slate-300">{dim.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Signal Light */}
                        <span className={`w-2 h-2 rounded-full ${
                          current.trend === 'up' ? 'bg-green-400 animate-pulse' :
                          current.trend === 'down' ? 'bg-red-400' : 'bg-amber-400'
                        }`}></span>
                        <span className={`text-sm font-bold ${
                          current.trend === 'up' ? 'text-green-400' :
                          current.trend === 'down' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {current.status}
                        </span>
                      </div>
                    </div>

                    {/* Top 2 Evidence (collapsed view) */}
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 truncate">
                        {current.desc.split('，')[0]}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {current.desc.split('，')[1] || ''}
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <div className="flex items-center justify-center mt-2 text-slate-500">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                      <div className="text-[10px] text-slate-400">
                        <span className="text-slate-500">详细描述：</span>
                        {current.desc}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        <span className="text-slate-400">趋势信号：</span>
                        <span className={current.trend === 'up' ? 'text-green-400' : current.trend === 'down' ? 'text-red-400' : 'text-amber-400'}>
                          {current.trend === 'up' ? '↑ 上行' : current.trend === 'down' ? '↓ 下行' : '→ 震荡'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI 最新点评 */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-100">
            <Sparkles className="w-4 h-4 text-amber-500" />
            AI 最新点评
            <span className="text-[10px] text-slate-500 font-normal">(展示层 Indicative)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-xs text-slate-300 space-y-2">
          <div className="whitespace-pre-line leading-relaxed">
            {aiLoading ? "生成中..." : (latestAI?.summary || "等待行情加载后生成...")}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-slate-500">
              {latestAI?.createdAt ? `更新时间: ${new Date(latestAI.createdAt).toLocaleString()}` : ""}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLatestAI}
              disabled={aiLoading}
              className="h-7 text-xs border-slate-700 text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${aiLoading ? "animate-spin" : ""}`} />
              刷新点评
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据分层声明 */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-3 md:p-4 text-xs text-slate-400 space-y-2">
          <div className="flex items-start gap-2">
            <StatusBadge status="LIVE" note="Indicative" title="可用但不可用于回测/信号的展示层数据" />
            <div>
              <span className="text-slate-200 font-medium">展示层(Indicative)</span>：实时行情/资讯用于“看盘与监控”，可能来自 Yahoo/Polygon/FRED/Eastmoney 等第三方源；
              <span className="text-amber-300 font-medium">不得用于回测真值与策略净值</span>。
            </div>
          </div>
          <div className="flex items-start gap-2">
            <StatusBadge status="LIVE" note="Truth" title="可审计可复现的真值层" />
            <div>
              <span className="text-slate-200 font-medium">真值层(Backtest/Signal)</span>：策略回测/净值/信号仅使用 Master + 官方结算镜像（Spot/Settle 双轨），可审计可复现。
            </div>
          </div>
          <div className="flex items-start gap-2">
            <StatusBadge status="SAMPLE" title="写死占位/联调数据" />
            <div>任何写死占位数据必须标注 SAMPLE；缺数据则显示 “—”，禁止用旧数值冒充。</div>
          </div>
        </CardContent>
      </Card>

      {/* 核心资产 - 按地区分组 */}
      <div className="space-y-4">
        {/* 美国资产 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">🇺🇸 美国市场</Badge>
            <span className="text-xs text-slate-500">
              实时数据 · Yahoo/Polygon（利率曲线来自 FRED，仅展示）
            </span>
          </div>

          {/* US Treasury Yield Curve (2Y/5Y/10Y/30Y) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {(marketData?.data.us || [])
              .filter((q) => q.symbol === "US2Y" || q.symbol === "US5Y" || q.symbol === "US10Y" || q.symbol === "US30Y")
              .map((q) => (
                <Card key={q.symbol} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-slate-400">{q.name.replace("美债收益率 ", "")}</div>
                      <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                        收盘
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-slate-50">{q.price.toFixed(2)}%</div>
                    <div className={`text-xs font-medium ${q.change < 0 ? "text-green-400" : q.change > 0 ? "text-red-400" : "text-slate-500"}`}>
                      {q.change > 0 ? "+" : ""}{q.change.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-1 truncate">{q.source}</div>
                  </CardContent>
                </Card>
              ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <Card key={i} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3">
                    <Skeleton className="h-4 w-16 mb-2 bg-slate-800" />
                    <Skeleton className="h-6 w-20 mb-1 bg-slate-800" />
                    <Skeleton className="h-3 w-10 bg-slate-800" />
                  </CardContent>
                </Card>
              ))
            ) : (
              marketData?.data.us
                // 去重：收益率曲线单独在上方卡片展示；TLT 也移到详情页（二屏），首页不占位
                .filter((q) => !(q.symbol === "US2Y" || q.symbol === "US5Y" || q.symbol === "US10Y" || q.symbol === "US30Y"))
                .filter((q) => q.symbol !== "TLT")
                .map((quote) => (
                  <AssetCard
                    key={quote.symbol}
                    quote={quote}
                  />
                ))
            )}
          </div>
        </div>

        {/* 中国资产 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🇨🇳 中国市场</Badge>
            <span className="text-xs text-slate-500">
              收盘数据（EOD Close）· AkShare（占位将标 SAMPLE）
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <Card key={i} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3">
                    <Skeleton className="h-4 w-16 mb-2 bg-slate-800" />
                    <Skeleton className="h-6 w-20 mb-1 bg-slate-800" />
                    <Skeleton className="h-3 w-10 bg-slate-800" />
                  </CardContent>
                </Card>
              ))
            ) : (
              marketData?.data.china
                .filter((q) => q.category === "EQUITY")
                .map((quote) => (
                  <AssetCard
                    key={quote.symbol}
                    quote={quote}
                  />
                ))
            )}
          </div>
        </div>

        {/* 中国债券：国债期货主力 + 收益率曲线 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">🇨🇳 中国债券</Badge>
            <span className="text-xs text-slate-500">
              国债期货主力 + 收益率曲线 · SAMPLE（占位联调，非实时/非回测真值）
            </span>
          </div>

          {/* 国债期货主力（TS → TF → T → TL） */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <Card key={i} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3">
                    <Skeleton className="h-4 w-16 mb-2 bg-slate-800" />
                    <Skeleton className="h-6 w-20 mb-1 bg-slate-800" />
                    <Skeleton className="h-3 w-10 bg-slate-800" />
                  </CardContent>
                </Card>
              ))
            ) : (
              (marketData?.bond?.china?.futures || []).map((quote) => (
                <AssetCard key={quote.symbol} quote={quote} />
              ))
            )}
          </div>

          {/* 收益率曲线（同屏展示：2Y / 5Y / 10Y / 30Y） */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(marketData?.bond?.china?.yieldCurve || [])
              .filter(p => ["2Y", "5Y", "10Y", "30Y"].includes(p.maturity))
              .map((p) => (
                <Card key={p.maturity} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-slate-400">{p.maturity} 国债</div>
                      <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                        收盘
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-slate-50">{p.yield.toFixed(2)}%</div>
                    <div className={`text-xs font-medium ${p.change < 0 ? "text-green-400" : p.change > 0 ? "text-red-400" : "text-slate-500"}`}>
                      {p.change > 0 ? "+" : ""}{p.change.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-1 truncate">SAMPLE</div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* 港股 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">🇭🇰 香港市场</Badge>
            <span className="text-xs text-slate-500">
              收盘数据 · AkShare (日度更新)
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isLoading ? (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-16 mb-2 bg-slate-800" />
                  <Skeleton className="h-6 w-20 mb-1 bg-slate-800" />
                  <Skeleton className="h-3 w-10 bg-slate-800" />
                </CardContent>
              </Card>
            ) : (
              marketData?.data.hongkong.map((quote) => (
                <AssetCard
                  key={quote.symbol}
                  quote={quote}
                />
              ))
            )}
          </div>
        </div>

        {/* 全球商品 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">🌍 全球商品</Badge>
            <span className="text-xs text-slate-500">
              实时数据 · Yahoo/Polygon
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <Card key={i} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3">
                    <Skeleton className="h-4 w-16 mb-2 bg-slate-800" />
                    <Skeleton className="h-6 w-20 mb-1 bg-slate-800" />
                    <Skeleton className="h-3 w-10 bg-slate-800" />
                  </CardContent>
                </Card>
              ))
            ) : (
              marketData?.data.global.map((quote) => (
                <AssetCard
                  key={quote.symbol}
                  quote={quote}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 策略净值追踪 */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base md:text-lg flex items-center gap-2 text-slate-100">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                  策略净值追踪
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {navStatus === "LOADING" && <span className="text-xs text-slate-500">加载中...</span>}
                  {navStatus === "SAMPLE" && <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-400">SAMPLE · asOf {navAsOf}</Badge>}
                  {navStatus === "LIVE" && <Badge variant="outline" className="text-[10px] bg-green-500/10 border-green-500/30 text-green-400">LIVE · asOf {navAsOf}</Badge>}
                  {navStatus === "OFFLINE" && <Badge variant="outline" className="text-[10px] bg-red-500/10 border-red-500/30 text-red-400">OFFLINE · 无数据</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                {[
                  { id: 'beta-7-0', label: '中美全天候Beta' },
                ].map((strategy) => (
                  <Button
                    key={strategy.id}
                    variant={selectedStrategy === strategy.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStrategy(strategy.id)}
                    className={`text-xs h-7 px-2 ${
                      selectedStrategy === strategy.id
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500'
                        : 'border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {strategy.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          {navStatus === "OFFLINE" && (
            <CardContent>
              <div className="h-[250px] md:h-[320px] w-full flex flex-col items-center justify-center text-slate-500 gap-2">
                <TrendingUp className="w-8 h-8 opacity-50" />
                <p className="text-sm">策略净值数据暂不可用</p>
                <p className="text-xs text-slate-600">请稍后刷新或联系管理员</p>
              </div>
            </CardContent>
          )}
          {navStatus === "LOADING" && (
            <CardContent>
              <div className="h-[250px] md:h-[320px] w-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
              </div>
            </CardContent>
          )}
          {navStatus !== "OFFLINE" && navStatus !== "LOADING" && (
          <CardContent>
            <div className="h-[250px] md:h-[320px] w-full min-h-[300px]">
              <div className="w-full h-full min-h-[300px]">
                <ResponsiveContainer width="99%" height="100%" minHeight={300}>
                <LineChart data={strategyNavData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value.slice(0, 7)}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => value.toFixed(2)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value) => typeof value === 'number' ? value.toFixed(4) : value}
                  />
                  <Legend />

                  {(selectedStrategy === 'beta-7-0') && (
                    <Line
                      type="monotone"
                      dataKey="中美全天候Beta"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
          )}
        </Card>

        {/* 组合表现（单策略） */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg text-slate-100">中美全天候Beta · 风险收益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-400">年化收益率 (CAGR)</div>
                <div className="text-lg font-bold text-slate-50">{navMetrics?.cagr == null ? "—" : `${(navMetrics.cagr * 100).toFixed(2)}%`}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-400">年化波动率 (Vol)</div>
                <div className="text-lg font-bold text-slate-50">{navMetrics?.vol == null ? "—" : `${(navMetrics.vol * 100).toFixed(2)}%`}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-400">最大回撤 (Max DD)</div>
                <div className="text-lg font-bold text-slate-50">{navMetrics?.maxDrawdown == null ? "—" : `${(navMetrics.maxDrawdown * 100).toFixed(2)}%`}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-400">夏普 (rf=0)</div>
                <div className="text-lg font-bold text-slate-50">{navMetrics?.sharpe == null ? "—" : navMetrics.sharpe.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">月度口径（EOM）计算并年化 · asOf {navAsOf || "—"}</div>
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg text-slate-100">快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/strategies">
              <Button className="w-full justify-start gap-3 h-auto py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-medium">
                <TrendingUp className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm">策略净值</div>
                  <div className="text-[10px] opacity-80">中美全天候Beta（月度净值）</div>
                </div>
              </Button>
            </Link>

            <Link href="/reports">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-200">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div className="text-left">
                  <div className="text-sm">生成AI报告</div>
                  <div className="text-[10px] text-slate-500">基于实时数据生成投资分析</div>
                </div>
              </Button>
            </Link>

            <Link href="/academy">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-200">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <div className="text-sm">投资学院</div>
                  <div className="text-[10px] text-slate-500">术语词典与策略案例</div>
                </div>
              </Button>
            </Link>

            {/* 数据说明 */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-500 mb-2">数据说明</div>
              <div className="space-y-1 text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>实时: Yahoo/Polygon (美股/商品)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>收盘: AkShare (A股/港股/债券)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>延迟: 美股ETF追踪A股 (15-20min)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 宏观指标 */}
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

      {/* 最新资讯 */}
      <NewsSection />
    </div>
  );
}