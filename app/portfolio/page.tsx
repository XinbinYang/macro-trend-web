"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus,
  Trash2,
  User,
  LogOut
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
              <ResponsiveContainer width="99%" height="100%">
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
    </div>
  );
}
