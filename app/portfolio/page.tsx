"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus,
  Trash2,
  User,
  LogOut,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Shield,
  Activity,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Zap
} from "lucide-react";

// 宏观状态接口
interface MacroRegimeData {
  region: string;
  status: string;
  updatedAt: string;
  regime: {
    name: string;
    confidence: number;
    driver: string;
    counterSignals: Array<{
      condition: string;
      implication: string;
      action: string;
      severity?: "high" | "medium" | "low";
      triggered?: boolean;
    }>;
  };
}
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  costPrice: number;
  currentPrice: number;
}

interface User {
  name: string;
  email: string;
  isLoggedIn: boolean;
}

// NAV数据接口
interface NAVData {
  strategy: string;
  name: string;
  status: string;
  asOf: string;
  nav: { date: string; value: number }[];
  metrics: {
    cagr: number;
    vol: number;
    maxDrawdown: number;
    sharpe: number;
    leverageCurrent: number;
    leverageAvg: number;
    leverageMin: number;
    leverageMax: number;
  };
  disclaimer: string;
}

// 风险暴露数据接口 (扩展支持 indicative)
interface RiskExposure {
  assetClass: string;
  label: string;
  current: number;
  target: number;
  deviation: number;
  source: "truth" | "indicative" | "placeholder";
  methodology?: string;
}

// 波动/回撤数据接口
interface VolatilityData {
  period: string;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  source: "truth" | "indicative" | "placeholder";
  dataPoints?: number;
}

// 再平衡建议接口 (扩展支持置信度)
interface RebalanceSuggestion {
  symbol: string;
  action: "buy" | "sell" | "hold";
  currentWeight: number;
  targetWeight: number;
  amount: number;
  reason: string;
  confidence?: "high" | "medium" | "low";
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// 目标风险配置 (Beta 7.0 标准) - 预留结构
// const TARGET_ALLOCATION = {
  // "US Equity": 50,
  // "CN Equity": 15,
  // "US Bond": 20,
  // "CN Bond": 5,
  // "Commodity": 5,
  // "Gold": 5,
  // };

export default function PortfolioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [newItem, setNewItem] = useState({ symbol: "", shares: "", costPrice: "" });
  
  // NAV/Performance 状态
  const [navData, setNavData] = useState<NAVData | null>(null);
  const [navLoading, setNavLoading] = useState(false);

  // 风险暴露状态
  const [riskExposure, setRiskExposure] = useState<RiskExposure[]>([]);
  const [riskLoading, setRiskLoading] = useState(false);

  // 波动率状态
  const [volatilityData, setVolatilityData] = useState<VolatilityData[]>([]);
  const [volLoading, setVolLoading] = useState(false);

  // 宏观状态 (三大中枢联动)
  const [macroRegime, setMacroRegime] = useState<MacroRegimeData | null>(null);
  const [macroLoading, setMacroLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));

    // 加载投资组合
    const savedPortfolio = localStorage.getItem("portfolio");
    if (savedPortfolio) {
      setPortfolio(JSON.parse(savedPortfolio));
    } else {
      // 默认示例数据
      const defaultPortfolio = [
        { id: "1", symbol: "SPY", name: "标普500 ETF", shares: 100, costPrice: 450, currentPrice: 580 },
        { id: "2", symbol: "QQQ", name: "纳斯达克100 ETF", shares: 50, costPrice: 380, currentPrice: 490 },
        { id: "3", symbol: "GLD", name: "黄金ETF", shares: 80, costPrice: 180, currentPrice: 220 },
      ];
      setPortfolio(defaultPortfolio);
      localStorage.setItem("portfolio", JSON.stringify(defaultPortfolio));
    }
    
    // 加载所有数据
    fetchNAVData();
    fetchRiskExposure();
    fetchVolatilityData();
    fetchMacroRegime();
  }, [router]);

  const fetchNAVData = async () => {
    setNavLoading(true);
    try {
      const res = await fetch("/api/nav?strategy=beta70");
      const json = await res.json();
      if (json.success) {
        setNavData(json.data);
      }
    } catch (e) {
      console.error("Failed to load NAV:", e);
    } finally {
      setNavLoading(false);
    }
  };

  const fetchRiskExposure = async () => {
    setRiskLoading(true);
    try {
      const res = await fetch("/api/risk-exposure");
      const json = await res.json();
      if (json.success) {
        setRiskExposure(json.data);
      }
    } catch (e) {
      console.error("Failed to load risk exposure:", e);
    } finally {
      setRiskLoading(false);
    }
  };

  const fetchVolatilityData = async () => {
    setVolLoading(true);
    try {
      const res = await fetch("/api/volatility");
      const json = await res.json();
      if (json.success) {
        setVolatilityData(json.data);
      }
    } catch (e) {
      console.error("Failed to load volatility data:", e);
    } finally {
      setVolLoading(false);
    }
  };

  // 三大中枢联动：获取宏观状态
  const fetchMacroRegime = async () => {
    setMacroLoading(true);
    try {
      const res = await fetch("/api/macro-regime");
      const json = await res.json();
      if (json.success) {
        setMacroRegime(json.data);
      }
    } catch (e) {
      console.error("Failed to load macro regime:", e);
    } finally {
      setMacroLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const addPosition = () => {
    if (!newItem.symbol || !newItem.shares || !newItem.costPrice) return;
    
    const item: PortfolioItem = {
      id: Date.now().toString(),
      symbol: newItem.symbol.toUpperCase(),
      name: newItem.symbol.toUpperCase(),
      shares: parseFloat(newItem.shares),
      costPrice: parseFloat(newItem.costPrice),
      currentPrice: parseFloat(newItem.costPrice) * (1 + (Math.random() - 0.3) * 0.2),
    };
    
    const updated = [...portfolio, item];
    setPortfolio(updated);
    localStorage.setItem("portfolio", JSON.stringify(updated));
    setNewItem({ symbol: "", shares: "", costPrice: "" });
  };

  const removePosition = (id: string) => {
    const updated = portfolio.filter(p => p.id !== id);
    setPortfolio(updated);
    localStorage.setItem("portfolio", JSON.stringify(updated));
  };

  // 用户持仓相关统计 (保留原有逻辑)
  const totalValue = portfolio.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);

  // 资产配置数据
  const allocationData = portfolio.map(p => ({
    name: p.symbol,
    value: p.shares * p.currentPrice,
  }));

  // ============================================
  // 数据源处理
  // ============================================
  
  // 1. NAV Performance - 真实数据 (Truth)
  const getPerformanceData = () => {
    if (!navData) return null;
    
    const latestNAV = navData.nav[navData.nav.length - 1];
    const firstNAV = navData.nav[0];
    const totalReturn = ((latestNAV.value - firstNAV.value) / firstNAV.value) * 100;
    
    return {
      nav: latestNAV.value,
      asOf: navData.asOf,
      cagr: navData.metrics.cagr * 100,
      vol: navData.metrics.vol * 100,
      maxDrawdown: navData.metrics.maxDrawdown * 100,
      sharpe: navData.metrics.sharpe,
      totalReturn,
      leverage: navData.metrics.leverageCurrent,
      disclaimer: navData.disclaimer,
      status: navData.status,
    };
  };
  
  const performance = getPerformanceData();

  // 2. 风险暴露 - 使用 API 数据，标记为 indicative
  const getRiskExposureData = (): RiskExposure[] => {
    if (riskExposure.length > 0) {
      return riskExposure.map(r => ({
        ...r,
        source: r.source as "truth" | "indicative" | "placeholder",
      }));
    }
    
    // 降级：占位数据，带清晰标记
    return [
      { assetClass: "US Equity", label: "美股", current: 52.3, target: 50, deviation: 2.3, source: "placeholder" },
      { assetClass: "CN Equity", label: "中股", current: 14.8, target: 15, deviation: -0.2, source: "placeholder" },
      { assetClass: "US Bond", label: "美债", current: 21.2, target: 20, deviation: 1.2, source: "placeholder" },
      { assetClass: "CN Bond", label: "中债", current: 4.8, target: 5, deviation: -0.2, source: "placeholder" },
      { assetClass: "Commodity", label: "商品", current: 3.9, target: 5, deviation: -1.1, source: "placeholder" },
      { assetClass: "Gold", label: "黄金", current: 3.0, target: 5, deviation: -2.0, source: "placeholder" },
    ];
  };

  const riskExposureData = getRiskExposureData();

  // 3. 波动/回撤 - 使用 API 数据，标记为 truth/indicative
  const getVolatilityData = (): VolatilityData[] => {
    if (volatilityData.length > 0) {
      return volatilityData.map(v => ({
        ...v,
        source: v.source as "truth" | "indicative" | "placeholder",
      }));
    }
    
    // 降级：占位数据
    return performance ? [
      { period: "Since Inception", volatility: performance.vol, maxDrawdown: performance.maxDrawdown, sharpeRatio: performance.sharpe, source: "truth" },
      { period: "30D (est)", volatility: 8.2, maxDrawdown: -3.1, sharpeRatio: 1.2, source: "indicative" },
      { period: "90D", volatility: 12.5, maxDrawdown: -7.8, sharpeRatio: 0.95, source: "indicative" },
      { period: "YTD", volatility: 11.2, maxDrawdown: -9.6, sharpeRatio: 1.15, source: "indicative" },
    ] : [
      { period: "30D", volatility: 8.2, maxDrawdown: -3.1, sharpeRatio: 1.2, source: "placeholder" },
      { period: "90D", volatility: 12.5, maxDrawdown: -7.8, sharpeRatio: 0.95, source: "placeholder" },
      { period: "180D", volatility: 14.8, maxDrawdown: -12.4, sharpeRatio: 1.08, source: "placeholder" },
      { period: "YTD", volatility: 11.2, maxDrawdown: -9.6, sharpeRatio: 1.15, source: "placeholder" },
    ];
  };

  const volatility = getVolatilityData();

  // 4. 再平衡建议 (基于风险暴露偏离度计算 + 更合理的逻辑)
  const REBALANCE_THRESHOLD = 3; // 偏离超过 3% 才建议再平衡
  const MIN_TRADE_AMOUNT = 1000; // 最小交易金额门槛
  
  const rebalanceSuggestions: RebalanceSuggestion[] = riskExposureData
    .filter(r => Math.abs(r.deviation) > REBALANCE_THRESHOLD)
    .filter(r => {
      // 过滤掉金额太小的建议
      const amount = Math.abs(r.deviation / 100 * (performance?.nav || 100000));
      return amount >= MIN_TRADE_AMOUNT;
    })
    .map(r => {
      const amount = Math.abs(r.deviation / 100 * (performance?.nav || 100000));
      const deviationAbs = Math.abs(r.deviation);
      
      // 更详细的原因说明
      let reason = "";
      if (r.deviation > 0) {
        if (deviationAbs > 5) reason = "显著超配，建议减持";
        else if (deviationAbs > 3) reason = "轻微超配，可考虑减持";
        else reason = "略超配，观望";
      } else {
        if (deviationAbs > 5) reason = "显著低配，建议增持";
        else if (deviationAbs > 3) reason = "轻微低配，可考虑增持";
        else reason = "略低配，观望";
      }
      
      return {
        symbol: r.label,
        action: r.deviation > 0 ? "sell" as const : "buy" as const,
        currentWeight: r.current,
        targetWeight: r.target,
        amount,
        reason,
        confidence: r.source === "truth" ? "high" as const : r.source === "indicative" ? "medium" as const : "low" as const,
      };
    })
    // 按偏离度排序，优先处理偏离大的
    .sort((a, b) => Math.abs(b.currentWeight - b.targetWeight) - Math.abs(a.currentWeight - a.targetWeight));

  // 获取风险等级
  const getRiskLevel = () => {
    const realVol = volatility.find(v => v.source === "truth")?.volatility || 
                    volatility.find(v => v.source === "indicative")?.volatility ||
                    volatility.reduce((sum, v) => sum + v.volatility, 0) / Math.max(volatility.length, 1);
    if (realVol < 10) return { level: "保守", color: "text-green-400", bg: "bg-green-500/20" };
    if (realVol < 15) return { level: "稳健", color: "text-amber-400", bg: "bg-amber-500/20" };
    return { level: "积极", color: "text-red-400", bg: "bg-red-500/20" };
  };
  const riskInfo = getRiskLevel();

  // 获取数据源标记颜色
  const getSourceBadge = (source: "truth" | "indicative" | "placeholder") => {
    switch (source) {
      case "truth":
        return { label: "真值", color: "text-green-400", bg: "bg-green-500/20" };
      case "indicative":
        return { label: "参考", color: "text-amber-400", bg: "bg-amber-500/20" };
      default:
        return { label: "占位", color: "text-slate-400", bg: "bg-slate-500/20" };
    }
  };

  // 准备图表数据 (NAV 走势)
  const chartData = navData?.nav.slice(-60).map(d => ({
    date: d.date.slice(5), // MM-DD
    value: d.value,
  })) || [];

  // 刷新所有数据
  const refreshAllData = () => {
    fetchNAVData();
    fetchRiskExposure();
    fetchVolatilityData();
    fetchMacroRegime();
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">
            组合驾驶舱
          </h1>
          <p className="text-sm text-slate-500">Beta 7.0 全天候策略实时监控</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshAllData}
            disabled={navLoading || riskLoading || volLoading || macroLoading}
            className="text-slate-400"
          >
            {(navLoading || riskLoading || volLoading || macroLoading) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">{user.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 三大中枢联动：宏观上下文横幅 */}
      {macroRegime && (
        <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-200">当前宏观状态</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    macroRegime.regime.name === "Neutral" ? "bg-amber-500/20 text-amber-400" :
                    macroRegime.regime.name === "Bullish" ? "bg-green-500/20 text-green-400" :
                    macroRegime.regime.name === "Bearish" ? "bg-red-500/20 text-red-400" :
                    "bg-slate-500/20 text-slate-400"
                  }`}>
                    {macroRegime.regime.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                    置信度 {macroRegime.regime.confidence}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{macroRegime.regime.driver}</p>
                {macroRegime.regime.counterSignals && macroRegime.regime.counterSignals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {macroRegime.regime.counterSignals.slice(0, 3).map((signal, idx) => (
                      <div 
                        key={idx}
                        className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 ${
                          signal.severity === "high" ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                          signal.severity === "medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" :
                          "bg-slate-500/10 text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        <span className="max-w-[150px] truncate">{signal.condition}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-500">
                更新: {new Date(macroRegime.updatedAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NAV Performance 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>NAV (Beta 7.0)</span>
              {performance?.status === "SAMPLE" ? (
                <span className="text-amber-400">样本</span>
              ) : (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              )}
            </div>
            {navLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-400">加载中...</span>
              </div>
            ) : performance ? (
              <>
                <div className="text-xl font-bold text-slate-100">
                  {performance.nav.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  @ {performance.asOf}
                </div>
              </>
            ) : (
              <div className="text-sm text-red-400">数据不可用</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">年化收益率</div>
            <div className={`text-xl font-bold ${performance && performance.cagr >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {performance ? `+${performance.cagr.toFixed(2)}%` : '--'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">年化波动率</div>
            <div className="text-xl font-bold text-slate-100">
              {performance ? `${performance.vol.toFixed(2)}%` : '--'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">最大回撤</div>
            <div className="text-xl font-bold text-red-400">
              {performance ? `${performance.maxDrawdown.toFixed(2)}%` : '--'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">夏普比率</div>
            <div className={`text-xl font-bold ${performance && performance.sharpe >= 1 ? 'text-green-400' : 'text-amber-400'}`}>
              {performance ? performance.sharpe.toFixed(2) : '--'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NAV 走势图 */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-100">NAV 走势 (近60期)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => v.toFixed(0)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value) => [`${Number(value).toFixed(2)}`, 'NAV']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#f59e0b" 
                    fillOpacity={1} 
                    fill="url(#navGradient)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500">
              暂无数据
            </div>
          )}
          {performance?.disclaimer && (
            <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 p-2 rounded flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span>{performance.disclaimer}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 用户持仓 (保留原有功能) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-100">我的持仓</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolio.map((item) => {
                const gain = (item.currentPrice - item.costPrice) * item.shares;
                const gainPercent = ((item.currentPrice - item.costPrice) / item.costPrice) * 100;
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-300">{item.symbol}</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.shares}股 · 成本${item.costPrice}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-slate-200">
                        ${(item.shares * item.currentPrice).toLocaleString()}
                      </div>
                      <div className={`text-xs ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gain >= 0 ? '+' : ''}{gain.toFixed(0)} ({gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%)
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removePosition(item.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              
              {portfolio.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  暂无持仓，请添加您的第一笔投资
                </div>
              )}
            </div>

            {/* 添加新持仓 */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-sm text-slate-400 mb-3">添加持仓</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="代码"
                  value={newItem.symbol}
                  onChange={(e) => setNewItem({ ...newItem, symbol: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-100"
                />
                <input
                  type="number"
                  placeholder="股数"
                  value={newItem.shares}
                  onChange={(e) => setNewItem({ ...newItem, shares: e.target.value })}
                  className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-100"
                />
                <input
                  type="number"
                  placeholder="成本"
                  value={newItem.costPrice}
                  onChange={(e) => setNewItem({ ...newItem, costPrice: e.target.value })}
                  className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-100"
                />
                <Button onClick={addPosition} size="sm" className="bg-amber-500 text-slate-950">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 资产配置饼图 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-100">资产配置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={allocationData.length > 0 ? allocationData : [
                      { name: "无持仓", value: 1 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(allocationData.length > 0 ? allocationData : [{ name: "无持仓", value: 1 }]).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name === "无持仓" ? "#334155" : COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value) => allocationData.length > 0 ? [`$${Number(value).toLocaleString()}`, ''] : ['--', '']}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 space-y-2">
              {allocationData.length > 0 ? allocationData.map((item, index) => {
                const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-slate-400">{percent.toFixed(1)}%</span>
                  </div>
                );
              }) : (
                <div className="text-center text-sm text-slate-500 py-4">
                  暂无持仓数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* 风险暴露 + 波动/回撤 - 真值化版本 */}
      {/* ============================================ */}
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 风险暴露 - Indicative 数据 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base text-slate-100">风险暴露 (Risk Exposure)</CardTitle>
              {riskExposureData[0]?.source === "truth" ? (
                <span className="text-xs text-green-400">[真值]</span>
              ) : riskExposureData[0]?.source === "indicative" ? (
                <span className="text-xs text-amber-400">[参考]</span>
              ) : (
                <span className="text-xs text-slate-400">[占位]</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {riskExposureData.map((item) => {
                  const badge = getSourceBadge(item.source);
                  return (
                    <div key={item.assetClass} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">{item.label} ({item.assetClass})</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">
                            {item.current.toFixed(1)}% / {item.target}%
                          </span>
                          {item.source !== "placeholder" && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${badge.bg} ${badge.color}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                        {/* 目标基准线 */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10"
                          style={{ left: `${item.target}%` }}
                        />
                        {/* 当前实际 */}
                        <div 
                          className={`absolute top-0 bottom-0 rounded-full transition-all ${
                            Math.abs(item.deviation) > 5 ? 'bg-red-500' : 
                            Math.abs(item.deviation) > 2 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(item.current, 100)}%` }}
                        />
                      </div>
                      <div className={`text-xs text-right ${
                        item.deviation > 0 ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {item.deviation > 0 ? '+' : ''}{item.deviation.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-500" /> 目标配置线
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-green-500 rounded" /> 低偏离
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-amber-500 rounded" /> 中偏离
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-red-500 rounded" /> 高偏离
              </div>
              <span className="ml-auto text-slate-400">
                计算方法: 风险平价 (90天回溯)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 波动/回撤 - Truth 数据 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base text-slate-100">波动率与回撤</CardTitle>
              {volatility.some(v => v.source === "truth") && (
                <span className="text-xs text-green-400">[真值]</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {volLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {volatility.map((item) => {
                  const badge = getSourceBadge(item.source);
                  return (
                    <div key={item.period} className="p-3 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">{item.period}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${badge.bg} ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-400">波动率</span>
                          <span className="text-sm text-slate-200">{item.volatility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-400">最大回撤</span>
                          <span className="text-sm text-red-400">{item.maxDrawdown}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-400">夏普比率</span>
                          <span className={`text-sm ${item.sharpeRatio >= 1 ? 'text-green-400' : 'text-amber-400'}`}>
                            {item.sharpeRatio}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">风险等级</span>
                <span className={`text-sm font-medium px-2 py-1 rounded ${riskInfo.color} ${riskInfo.bg}`}>
                  {riskInfo.level}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 再平衡建议 */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base text-slate-100">再平衡建议 (Rebalance)</CardTitle>
              <span className="text-xs text-amber-400 ml-2">
                {riskExposureData[0]?.source === "placeholder" ? "[基于占位风险暴露]" : "[基于参考风险暴露]"}
              </span>
            </div>
            {rebalanceSuggestions.length > 0 && (
              <span className="text-xs text-amber-400">
                {rebalanceSuggestions.length} 项建议
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rebalanceSuggestions.length > 0 ? (
            <div className="space-y-3">
              {rebalanceSuggestions.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {item.action === 'buy' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">{item.symbol}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          item.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {item.action === 'buy' ? '买入' : '卖出'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{item.reason}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-200">
                      {item.currentWeight.toFixed(1)}% → {item.targetWeight.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">
                      ${item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>组合已接近目标配置，无需再平衡</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}