"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Activity, Globe, BarChart3, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
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

interface HistoricalPoint {
  date: string;
  price: number;
}

// 主要指数配置
const mainIndices = [
  { symbol: "SPY", name: "标普500", region: "美股", emoji: "🇺🇸" },
  { symbol: "QQQ", name: "纳斯达克100", region: "美股", emoji: "🇺🇸" },
  { symbol: "ASHR", name: "沪深300", region: "A股", emoji: "🇨🇳" },
  { symbol: "GLD", name: "黄金ETF", region: "商品", emoji: "🥇" },
];

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("SPY");
  const [chartData, setChartData] = useState<HistoricalPoint[]>([]);

  // 获取实时数据
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/market-data-realtime");
      const data: MarketData = await res.json();
      
      if (data.success) {
        setMarketData(data);
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取历史数据
  const fetchHistoricalData = async (symbol: string) => {
    try {
      const res = await fetch(`/api/historical-data?symbol=${symbol}&days=30`);
      const data = await res.json();
      
      if (data.success) {
        setChartData(data.data);
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error(`[Dashboard] Failed to fetch historical data for ${symbol}:`, error);
      setChartData([]);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换选中资产时获取历史数据
  useEffect(() => {
    if (selectedSymbol) {
      fetchHistoricalData(selectedSymbol);
    }
  }, [selectedSymbol]);

  const getQuote = (symbol: string) => {
    if (!marketData) return null;
    return [...marketData.indices, ...marketData.assets].find(q => q.symbol === symbol);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">投资仪表盘</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            全球宏观投资分析 · 
            {marketData?.timestamp && (
              <span className="text-xs md:text-sm ml-1">
                更新于 {new Date(marketData.timestamp).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {marketData?.sources && Object.entries(marketData.sources).map(([source, count]) => (
            <Badge key={source} variant="secondary" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              {source}: {count}
            </Badge>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
            disabled={isLoading}
            className="gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">刷新</span>
          </Button>
        </div>
      </div>

      {/* 主要指数卡片 - 移动端2列，桌面端4列 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-3 md:p-4">
                <Skeleton className="h-3 w-16 md:w-20 mb-2" />
                <Skeleton className="h-6 md:h-8 w-20 md:w-28 mb-2" />
                <Skeleton className="h-3 w-14 md:w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          mainIndices.map(({ symbol, name, region, emoji }) => {
            const quote = getQuote(symbol);
            if (!quote) return null;
            const isPositive = quote.change >= 0;
            return (
              <Card 
                key={symbol} 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedSymbol === symbol ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedSymbol(symbol)}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-1.5 md:mb-2">
                    <span className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <span>{emoji}</span>
                      <span className="hidden sm:inline">{name}</span>
                      <span className="sm:hidden">{symbol}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 py-0">{region}</Badge>
                  </div>
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
                    {quote.price.toFixed(2)}
                  </div>
                  <div className={`flex items-center mt-1.5 md:mt-2 text-xs md:text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? (
                      <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 md:w-4 md:h-4 mr-0.5" />
                    )}
                    {isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    {quote.source} · {(quote.volume / 1000000).toFixed(1)}M
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 图表和详细数据 - 移动端堆叠，桌面端并排 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 价格走势图 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 md:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
                  {getQuote(selectedSymbol)?.name || selectedSymbol} - 价格走势
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">近30日价格趋势</CardDescription>
              </div>
              <div className="flex gap-1.5 md:gap-2">
                {["SPY", "QQQ", "ASHR", "GLD"].map(sym => (
                  <Button
                    key={sym}
                    variant={selectedSymbol === sym ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSymbol(sym)}
                    className="text-xs h-7 md:h-8 px-2 md:px-3"
                  >
                    {sym}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] md:h-[300px]">
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
                    className="text-[10px] md:text-xs"
                  />
                  <YAxis className="text-[10px] md:text-xs" domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      fontSize: '12px'
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
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Globe className="w-4 h-4 md:w-5 md:h-5" />
              全球市场
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">主要资产实时行情</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <Tabs defaultValue="indices" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8 md:h-9">
                <TabsTrigger value="indices" className="text-xs md:text-sm">指数</TabsTrigger>
                <TabsTrigger value="assets" className="text-xs md:text-sm">资产</TabsTrigger>
              </TabsList>
              <TabsContent value="indices" className="space-y-1.5 md:space-y-2 mt-3">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 md:h-14 w-full" />)
                ) : (
                  marketData?.indices.map(quote => (
                    <div 
                      key={quote.symbol} 
                      className="flex items-center justify-between p-2.5 md:p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedSymbol(quote.symbol)}
                    >
                      <div>
                        <div className="font-semibold text-sm md:text-base">{quote.symbol}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground truncate max-w-[100px] md:max-w-[140px]">{quote.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm md:text-base">{quote.price.toFixed(2)}</div>
                        <div className={`text-[10px] md:text-xs ${quote.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {quote.change >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
              <TabsContent value="assets" className="space-y-1.5 md:space-y-2 mt-3">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 md:h-14 w-full" />)
                ) : (
                  marketData?.assets.slice(0, 6).map(quote => (
                    <div 
                      key={quote.symbol} 
                      className="flex items-center justify-between p-2.5 md:p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedSymbol(quote.symbol)}
                    >
                      <div>
                        <div className="font-semibold text-sm md:text-base">{quote.symbol}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground truncate max-w-[100px] md:max-w-[140px]">{quote.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm md:text-base">{quote.price.toFixed(2)}</div>
                        <div className={`text-[10px] md:text-xs ${quote.change >= 0 ? "text-green-600" : "text-red-600"}`}>
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
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Activity className="w-4 h-4 md:w-5 md:h-5" />
            宏观指标监控
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">AI宏观作手核心分析维度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { name: "经济周期", status: "扩张期", color: "green", emoji: "📈", desc: "全球制造业PMI回升" },
              { name: "流动性", status: "宽松", color: "blue", emoji: "💧", desc: "主要央行维持低利率" },
              { name: "风险偏好", status: "中性", color: "yellow", emoji: "⚖️", desc: "VIX指数处于均值" },
              { name: "技术趋势", status: "上行", color: "green", emoji: "📊", desc: "主要指数突破均线" },
            ].map((indicator) => (
              <div key={indicator.name} className="p-3 md:p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                  <span className="text-base md:text-lg">{indicator.emoji}</span>
                  <span className="text-xs md:text-sm text-muted-foreground">{indicator.name}</span>
                </div>
                <div className={`text-base md:text-lg font-bold ${indicator.color === "green" ? "text-green-600" : indicator.color === "red" ? "text-red-600" : indicator.color === "blue" ? "text-blue-600" : "text-yellow-600"}`}>
                  {indicator.status}
                </div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-1 leading-tight">{indicator.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
