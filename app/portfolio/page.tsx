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
  Activity
} from "lucide-react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
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

// 风险暴露数据接口
interface RiskExposure {
  assetClass: string;
  current: number;
  target: number;
  deviation: number;
}

// 波动/回撤数据接口
interface VolatilityData {
  period: string;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

// 再平衡建议接口
interface RebalanceSuggestion {
  symbol: string;
  action: "buy" | "sell" | "hold";
  currentWeight: number;
  targetWeight: number;
  amount: number;
  reason: string;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function PortfolioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [newItem, setNewItem] = useState({ symbol: "", shares: "", costPrice: "" });

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
  }, [router]);

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

  // 计算统计数据
  const totalCost = portfolio.reduce((sum, p) => sum + p.shares * p.costPrice, 0);
  const totalValue = portfolio.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // 资产配置数据
  const allocationData = portfolio.map(p => ({
    name: p.symbol,
    value: p.shares * p.currentPrice,
  }));

  // ============================================
  // MVP: 组合驾驶舱 - 模拟数据 (后续接入真实数据)
  // ============================================
  
  // 1. 风险暴露数据 (模拟)
  const riskExposureData: RiskExposure[] = [
    { assetClass: "美股 (US Equity)", current: 58.2, target: 50, deviation: 8.2 },
    { assetClass: "中股 (CN Equity)", current: 12.4, target: 15, deviation: -2.6 },
    { assetClass: "美债 (US Bond)", current: 18.5, target: 20, deviation: -1.5 },
    { assetClass: "中债 (CN Bond)", current: 5.2, target: 5, deviation: 0.2 },
    { assetClass: "商品 (Commodity)", current: 3.1, target: 5, deviation: -1.9 },
    { assetClass: "黄金 (Gold)", current: 2.6, target: 5, deviation: -2.4 },
  ];

  // 2. 波动/回撤数据 (模拟)
  const volatilityData: VolatilityData[] = [
    { period: "30D", volatility: 8.2, maxDrawdown: -3.1, sharpeRatio: 1.2 },
    { period: "90D", volatility: 12.5, maxDrawdown: -7.8, sharpeRatio: 0.95 },
    { period: "180D", volatility: 14.8, maxDrawdown: -12.4, sharpeRatio: 1.08 },
    { period: "YTD", volatility: 11.2, maxDrawdown: -9.6, sharpeRatio: 1.15 },
  ];

  // 3. 再平衡建议 (基于偏离度计算)
  const rebalanceSuggestions: RebalanceSuggestion[] = riskExposureData
    .filter(r => Math.abs(r.deviation) > 3)
    .map(r => ({
      symbol: r.assetClass.split(" ")[0],
      action: r.deviation > 0 ? "sell" as const : "buy" as const,
      currentWeight: r.current,
      targetWeight: r.target,
      amount: Math.abs(r.deviation / 100 * totalValue),
      reason: r.deviation > 0 ? "超配需减持" : "低配需增持",
    }));

  // 获取风险等级
  const getRiskLevel = () => {
    const avgVolatility = volatilityData.reduce((sum, v) => sum + v.volatility, 0) / volatilityData.length;
    if (avgVolatility < 10) return { level: "保守", color: "text-green-400", bg: "bg-green-500/20" };
    if (avgVolatility < 15) return { level: "稳健", color: "text-amber-400", bg: "bg-amber-500/20" };
    return { level: "积极", color: "text-red-400", bg: "bg-red-500/20" };
  };
  const riskInfo = getRiskLevel();

  if (!user) return null;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">
            我的投资组合
          </h1>
          <p className="text-sm text-slate-500">跟踪您的资产配置与收益</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">{user.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">总资产</div>
            <div className="text-xl font-bold text-slate-100">
              ${totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">总收益</div>
            <div className={`text-xl font-bold ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalGain >= 0 ? '+' : ''}{totalGain.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">收益率</div>
            <div className={`text-xl font-bold ${totalGainPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">持仓数量</div>
            <div className="text-xl font-bold text-slate-100">
              {portfolio.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 持仓列表 */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-100">持仓明细</CardTitle>
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
            <div className="h-[250px] w-full min-h-[300px]">
              <ResponsiveContainer width="99%" height="100%" minHeight={300}>
                <RePieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 space-y-2">
              {allocationData.map((item, index) => {
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
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* MVP: 组合驾驶舱增强区域 */}
      {/* ============================================ */}
      
      {/* 第一行: 风险暴露 + 波动/回撤 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 风险暴露 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base text-slate-100">风险暴露 (Risk Exposure)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskExposureData.map((item) => (
                <div key={item.assetClass} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">{item.assetClass}</span>
                    <span className="text-slate-400">
                      {item.current.toFixed(1)}% / {item.target}%
                    </span>
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
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 bg-slate-500" /> 目标配置线
              <div className="w-3 h-1 bg-green-500 ml-3 rounded" /> 低偏离
              <div className="w-3 h-1 bg-amber-500 rounded" /> 中偏离
              <div className="w-3 h-1 bg-red-500 rounded" /> 高偏离
            </div>
          </CardContent>
        </Card>

        {/* 波动/回撤 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base text-slate-100">波动率与回撤 (Vol & Drawdown)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {volatilityData.map((item) => (
                <div key={item.period} className="p-3 bg-slate-800/30 rounded-lg">
                  <div className="text-xs text-slate-500 mb-2">{item.period}</div>
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
              ))}
            </div>
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

      {/* 第二行: 再平衡建议 */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base text-slate-100">再平衡建议 (Rebalance)</CardTitle>
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
