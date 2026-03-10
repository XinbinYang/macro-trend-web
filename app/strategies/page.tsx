"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Activity, 
  PieChart, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Info
} from "lucide-react";
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

// 策略配置
const STRATEGIES = [
  {
    id: "beta-7-0",
    name: "Beta 7.0",
    fullName: "中美全天候风险平价",
    description: "基于Ledoit-Wolf协方差矩阵的动态风险预算配置",
    emoji: "🛡️",
    color: "#3b82f6",
    metrics: {
      annualReturn: "8.5%",
      volatility: "6.2%",
      sharpe: "1.37",
      maxDrawdown: "-12.3%",
      since: "2005-01-01",
    },
  },
  {
    id: "alpha-2-0",
    name: "Alpha 2.0",
    fullName: "宏观趋势动量策略",
    description: "跨资产动量+期限结构+波动率择时",
    emoji: "🎯",
    color: "#f59e0b",
    metrics: {
      annualReturn: "12.3%",
      volatility: "8.7%",
      sharpe: "1.41",
      maxDrawdown: "-15.8%",
      since: "2015-01-01",
    },
  },
  {
    id: "mix-55",
    name: "5:5 Mix",
    fullName: "均衡配置组合",
    description: "Beta 7.0 (50%) + Alpha 2.0 (50%)",
    emoji: "⚖️",
    color: "#10b981",
    metrics: {
      annualReturn: "10.2%",
      volatility: "6.8%",
      sharpe: "1.50",
      maxDrawdown: "-11.5%",
      since: "2015-01-01",
    },
  },
  {
    id: "mix-73",
    name: "7:3 Mix",
    fullName: "稳健配置组合",
    description: "Beta 7.0 (70%) + Alpha 2.0 (30%)",
    emoji: "📊",
    color: "#8b5cf6",
    metrics: {
      annualReturn: "9.1%",
      volatility: "6.4%",
      sharpe: "1.42",
      maxDrawdown: "-10.8%",
      since: "2015-01-01",
    },
  },
];

// 模拟净值数据 (后续从GitHub读取)
function generateMockNavData() {
  const data = [];
  const startDate = new Date("2020-01-01");
  const endDate = new Date();
  
  let beta7 = 1.0;
  let alpha2 = 1.0;
  let mix55 = 1.0;
  let mix73 = 1.0;
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // 跳过周末
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    
    // 模拟收益
    const betaReturn = (Math.random() - 0.45) * 0.008;
    const alphaReturn = (Math.random() - 0.42) * 0.012;
    
    beta7 *= (1 + betaReturn);
    alpha2 *= (1 + alphaReturn);
    mix55 = beta7 * 0.5 + alpha2 * 0.5;
    mix73 = beta7 * 0.7 + alpha2 * 0.3;
    
    data.push({
      date: d.toISOString().split('T')[0],
      "Beta 7.0": Number(beta7.toFixed(4)),
      "Alpha 2.0": Number(alpha2.toFixed(4)),
      "5:5 Mix": Number(mix55.toFixed(4)),
      "7:3 Mix": Number(mix73.toFixed(4)),
    });
  }
  
  return data;
}

// 指标卡片
function MetricCard({ label, value, subtext, trend }: { label: string; value: string; subtext?: string; trend?: "up" | "down" | "neutral" }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${
        trend === 'up' ? 'text-green-400' : 
        trend === 'down' ? 'text-red-400' : 'text-slate-100'
      }`}>
        {value}
      </div>
      {subtext && <div className="text-[10px] text-slate-500">{subtext}</div>}
    </div>
  );
}

export default function StrategiesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [navData, setNavData] = useState<any[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState("all");

  useEffect(() => {
    // 模拟加载数据
    setTimeout(() => {
      setNavData(generateMockNavData());
      setIsLoading(false);
    }, 1000);
  }, []);

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setNavData(generateMockNavData());
      setIsLoading(false);
    }, 500);
  };

  // 获取最新净值
  const latestNav = navData[navData.length - 1] || {};
  const firstNav = navData[0] || {};

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">
            策略净值追踪
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Beta 7.0 / Alpha 2.0 / Mix组合历史表现
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Activity className="w-3 h-3 mr-1" />
            模拟数据
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isLoading}
            className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 策略卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STRATEGIES.map((strategy) => (
          <Card 
            key={strategy.id}
            className={`bg-slate-900/50 border-slate-800 cursor-pointer transition-all hover:border-slate-700 ${
              selectedStrategy === strategy.id ? 'ring-1 ring-amber-500/50 border-amber-500/30' : ''
            }`}
            onClick={() => setSelectedStrategy(selectedStrategy === strategy.id ? 'all' : strategy.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{strategy.emoji}</span>
                <div>
                  <div className="font-bold text-slate-100">{strategy.name}</div>
                  <div className="text-[10px] text-slate-500">{strategy.fullName}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <MetricCard 
                  label="年化收益" 
                  value={strategy.metrics.annualReturn}
                  trend="up"
                />
                <MetricCard 
                  label="夏普比率" 
                  value={strategy.metrics.sharpe}
                />
              </div>
              
              <div className="mt-3 text-[10px] text-slate-500">
                {strategy.description}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 净值曲线 */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2 text-slate-100">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              策略净值走势
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant={selectedStrategy === 'all' ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStrategy('all')}
                className={`text-xs h-7 ${
                  selectedStrategy === 'all' 
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' 
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                全部
              </Button>
              {STRATEGIES.map((s) => (
                <Button
                  key={s.id}
                  variant={selectedStrategy === s.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStrategy(s.id)}
                  className={`text-xs h-7 ${
                    selectedStrategy === s.id 
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' 
                      : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] md:h-[400px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton className="h-[300px] w-full bg-slate-800" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={navData}>
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
                    formatter={(value: number) => value.toFixed(4)}
                  />
                  <Legend />
                  
                  {(selectedStrategy === 'all' || selectedStrategy === 'beta-7-0') && (
                    <Line 
                      type="monotone" 
                      dataKey="Beta 7.0" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {(selectedStrategy === 'all' || selectedStrategy === 'alpha-2-0') && (
                    <Line 
                      type="monotone" 
                      dataKey="Alpha 2.0" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {(selectedStrategy === 'all' || selectedStrategy === 'mix-55') && (
                    <Line 
                      type="monotone" 
                      dataKey="5:5 Mix" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {(selectedStrategy === 'all' || selectedStrategy === 'mix-73') && (
                    <Line 
                      type="monotone" 
                      dataKey="7:3 Mix" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 详细指标 */}
      <div className="grid gap-4 md:grid-cols-2">
        {STRATEGIES.map((strategy) => (
          <Card key={strategy.id} className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{strategy.emoji}</span>
                <CardTitle className="text-base text-slate-100">{strategy.fullName}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="年化收益率" value={strategy.metrics.annualReturn} trend="up" />
                <MetricCard label="年化波动率" value={strategy.metrics.volatility} />
                <MetricCard label="夏普比率" value={strategy.metrics.sharpe} />
                <MetricCard label="最大回撤" value={strategy.metrics.maxDrawdown} trend="down" />
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  回测区间: {strategy.metrics.since} 至今
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 说明 */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 mt-0.5" />
            <div className="text-sm text-slate-300">
              <p className="font-medium text-slate-100 mb-1">数据说明</p>
              <p>当前展示为模拟数据。后续将接入真实回测引擎，每日收盘后自动更新净值曲线。</p>
              <p className="mt-1 text-xs text-slate-400">
                Beta 7.0: 2005年至今 · Alpha 2.0: 2015年至今 · Mix组合: 2015年至今
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}