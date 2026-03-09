"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TrendingUp, TrendingDown, Activity, Globe, BarChart3, Zap } from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
}

interface MarketData {
  success: boolean;
  sources: Record<string, number>;
  timestamp: string;
  indices: MarketQuote[];
  assets: MarketQuote[];
}

// 模拟历史数据（实际应从API获取）
const generateMockHistory = (basePrice: number, days: number = 30) => {
  const data = [];
  let price = basePrice;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price = price * (1 + (Math.random() - 0.5) * 0.02);
    data.push({
      date: date.toISOString().split('T')[0],
      price: Number(price.toFixed(2))
    });
  }
  return data;
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("SPY");
  const [chartData, setChartData] = useState<{date: string; price: number}[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/market-data-realtime");
      const data: MarketData = await res.json();
      
      if (data.success) {
        setMarketData(data);
        // 生成选中资产的模拟历史数据
        const quote = [...data.indices, ...data.assets].find(q => q.symbol === selectedSymbol);
        if (quote) {
          setChartData(generateMockHistory(quote.price));
        }
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  const handleRefresh = () => fetchData();

  const getQuote = (symbol: string) => {
    if (!marketData) return null;
    return [...marketData.indices, ...marketData.assets].find(q => q.symbol === symbol);
  };

  // 主要指数配置
  const mainIndices = [
    { symbol: "SPY", name: "标普500", region: "美股" },
    { symbol: "QQQ", name: "纳斯达克100", region: "美股" },
    { symbol: "IWM", name: "罗素2000", region: "美股" },
    { symbol: "ASHR", name: "沪深300", region: "A股" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">投资仪表盘</h1>
          <p className="text-muted-foreground mt-1">
            AI宏观作手 - 全球宏观投资分析
            {marketData?.timestamp && (
              <span className="ml-2 text-xs">
                更新于 {new Date(marketData.timestamp).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {marketData?.sources && Object.entries(marketData.sources).map(([source, count]) => (
            <Badge key={source} variant="secondary" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              {source}: {count}
            </Badge>
          ))}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 主要指数卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          mainIndices.map(({ symbol, name, region }) => {
            const quote = getQuote(symbol);
            if (!quote) return null;
            const isPositive = quote.change >= 0;
            return (
              <Card 
                key={symbol} 
                className={`cursor-pointer transition-all hover:shadow-lg ${selectedSymbol === symbol ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedSymbol(symbol)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">{name}</span>
                    <Badge variant="outline" className="text-xs">{region}</Badge>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">
                    {quote.price.toFixed(2)}
                  </div>
                  <div className={`flex items-center mt-2 text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {isPositive ? "+" : ""}{quote.change.toFixed(2)} ({isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%)
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    来源: {quote.source} · 成交量: {(quote.volume / 1000000).toFixed(1)}M
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 图表和详细数据 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 价格走势图 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  {getQuote(selectedSymbol)?.name || selectedSymbol} - 价格走势
                </CardTitle>
                <CardDescription>近30日价格趋势（模拟数据）</CardDescription>
              </div>
              <div className="flex gap-2">
                {["SPY", "QQQ", "ASHR", "GLD"].map(sym => (
                  <Button
                    key={sym}
                    variant={selectedSymbol === sym ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSymbol(sym)}
                  >
                    {sym}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value.slice(5)}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 市场概览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              全球市场
            </CardTitle>
            <CardDescription>主要资产实时行情</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="indices" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="indices">指数</TabsTrigger>
                <TabsTrigger value="assets">资产</TabsTrigger>
              </TabsList>
              <TabsContent value="indices" className="space-y-2">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)
                ) : (
                  marketData?.indices.map(quote => (
                    <div 
                      key={quote.symbol} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedSymbol(quote.symbol)}
                    >
                      <div>
                        <div className="font-semibold">{quote.symbol}</div>
                        <div className="text-xs text-muted-foreground">{quote.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{quote.price.toFixed(2)}</div>
                        <div className={`text-xs ${quote.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {quote.change >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
              <TabsContent value="assets" className="space-y-2">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)
                ) : (
                  marketData?.assets.map(quote => (
                    <div 
                      key={quote.symbol} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedSymbol(quote.symbol)}
                    >
                      <div>
                        <div className="font-semibold">{quote.symbol}</div>
                        <div className="text-xs text-muted-foreground">{quote.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{quote.price.toFixed(2)}</div>
                        <div className={`text-xs ${quote.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {quote.change >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 宏观指标 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            宏观指标监控
          </CardTitle>
          <CardDescription>AI宏观作手核心分析维度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { name: "经济周期", status: "扩张期", color: "green", desc: "全球制造业PMI回升" },
              { name: "流动性", status: "宽松", color: "blue", desc: "主要央行维持低利率" },
              { name: "风险偏好", status: "中性", color: "yellow", desc: "VIX指数处于均值" },
              { name: "技术趋势", status: "上行", color: "green", desc: "主要指数突破均线" },
            ].map((indicator) => (
              <div key={indicator.name} className="p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">{indicator.name}</div>
                <div className={`text-lg font-bold text-${indicator.color}-600`}>{indicator.status}</div>
                <div className="text-xs text-muted-foreground mt-1">{indicator.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
