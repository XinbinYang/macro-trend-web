"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Globe, BarChart3, Zap, ArrowUpRight, ArrowDownRight, Sparkles, Scale, CandlestickChart, LayoutGrid, Gauge } from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { MacroDashboard } from "@/components/macro-gauge";

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
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
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

// 资讯组件
function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300000); // 5分钟刷新
    return () => clearInterval(interval);
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setNews(data.data.slice(0, 5)); // 只显示前5条
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

// 主要指数配置
const mainIndices = [
  { symbol: "SPY", name: "标普500", region: "美股", emoji: "🇺🇸" },
  { symbol: "QQQ", name: "纳斯达克", region: "美股", emoji: "🇺🇸" },
  { symbol: "ASHR", name: "沪深300", region: "A股", emoji: "🇨🇳" },
  { symbol: "GLD", name: "黄金", region: "商品", emoji: "🥇" },
];

// 中国市场状态
const chinaMarketStatus = [
  { 
    id: "cn-cycle", 
    name: "经济周期", 
    status: "复苏期", 
    trend: "up",
    emoji: "📈",
    desc: "制造业PMI重回扩张区间" 
  },
  { 
    id: "cn-liquidity", 
    name: "流动性", 
    status: "宽松", 
    trend: "up",
    emoji: "💧",
    desc: "降准降息政策持续发力" 
  },
];

// 美国市场状态
const usMarketStatus = [
  { 
    id: "us-cycle", 
    name: "经济周期", 
    status: "扩张期", 
    trend: "up",
    emoji: "📈",
    desc: "ISM制造业突破荣枯线" 
  },
  { 
    id: "us-liquidity", 
    name: "流动性", 
    status: "紧缩", 
    trend: "neutral",
    emoji: "💧",
    desc: "高利率环境维持" 
  },
];

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("SPY");
  const [chartData, setChartData] = useState<HistoricalPoint[]>([]);

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

  const fetchHistoricalData = async (symbol: string) => {
    try {
      const res = await fetch(`/api/historical-data?symbol=${symbol}&days=30`);
      const data = await res.json();
      setChartData(data.success ? data.data : []);
    } catch {
      setChartData([]);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (selectedSymbol) fetchHistoricalData(selectedSymbol); }, [selectedSymbol]);

  const getQuote = (symbol: string) => {
    if (!marketData) return null;
    return [...marketData.indices, ...marketData.assets].find(q => q.symbol === symbol);
  };



  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-4 md:p-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2NGgtNHpNMjAgMjBoNHY0aC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
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
            
            <div className="flex items-center gap-2">
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

          {/* 市场状态卡片 - 中美分组 */}
          <div className="mt-4 md:mt-6 space-y-4">
            {/* 中国 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">🇨🇳 中国</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {chinaMarketStatus.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-3 md:p-4 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{item.emoji}</span>
                      <span className="text-xs text-slate-400">{item.name}</span>
                    </div>
                    <div className={`text-base md:text-lg font-bold ${
                      item.trend === 'up' ? 'text-green-400' : 
                      item.trend === 'down' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {item.status}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 美国 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">🇺🇸 美国</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {usMarketStatus.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-3 md:p-4 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{item.emoji}</span>
                      <span className="text-xs text-slate-400">{item.name}</span>
                    </div>
                    <div className={`text-base md:text-lg font-bold ${
                      item.trend === 'up' ? 'text-green-400' : 
                      item.trend === 'down' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {item.status}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 核心指数 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-16 mb-2 bg-slate-800" />
                <Skeleton className="h-8 w-24 mb-2 bg-slate-800" />
                <Skeleton className="h-3 w-12 bg-slate-800" />
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
                className={`bg-slate-900/50 border-slate-800 cursor-pointer transition-all hover:border-slate-700 hover:bg-slate-800/50 ${
                  selectedSymbol === symbol ? 'ring-1 ring-amber-500/50 border-amber-500/30' : ''
                }`}
                onClick={() => setSelectedSymbol(symbol)}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{emoji}</span>
                      <span className="text-xs text-slate-400">{name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">
                      {region}
                    </Badge>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-slate-50">
                    {quote.price.toFixed(2)}
                  </div>
                  <div className={`flex items-center mt-1 text-xs font-medium ${
                    isPositive ? "text-green-400" : "text-red-400"
                  }`}>
                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                    {isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 主内容区 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 图表 */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base md:text-lg flex items-center gap-2 text-slate-100">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                  {getQuote(selectedSymbol)?.name || selectedSymbol} 走势
                </CardTitle>
              </div>
              <div className="flex gap-1">
                {["SPY", "QQQ", "ASHR", "GLD"].map(sym => (
                  <Button
                    key={sym}
                    variant={selectedSymbol === sym ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSymbol(sym)}
                    className={`text-xs h-7 px-2 ${
                      selectedSymbol === sym 
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500' 
                        : 'border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sym}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value.slice(5)}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fill="url(#chartGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg text-slate-100">快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/reports">
              <Button className="w-full justify-start gap-3 h-auto py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-medium">
                <Sparkles className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm">生成AI报告</div>
                  <div className="text-[10px] opacity-80">基于实时数据生成投资分析</div>
                </div>
              </Button>
            </Link>
            
            <Link href="/assets">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-200">
                <Globe className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <div className="text-sm">浏览资产</div>
                  <div className="text-[10px] text-slate-500">查看六大类资产详情</div>
                </div>
              </Button>
            </Link>
            
            <Link href="/compare">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-200">
                <Scale className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <div className="text-sm">对比分析</div>
                  <div className="text-[10px] text-slate-500">多资产走势与相关性</div>
                </div>
              </Button>
            </Link>

            {/* 市场概览 */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-500 mb-2">数据源</div>
              <div className="flex flex-wrap gap-2">
                {marketData?.sources && Object.entries(marketData.sources).map(([source, count]) => (
                  <Badge key={source} variant="secondary" className="bg-slate-800 text-slate-400 border-slate-700 text-xs">
                    <Zap className="w-3 h-3 mr-1 text-amber-500" />
                    {source}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 新增：宏观指标仪表盘 */}
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

      {/* 板块热力图 - 简化版 */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg flex items-center gap-2 text-slate-100">
            <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
            市场概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {marketData?.indices.slice(0, 6).map((item) => (
              <div key={item.symbol} className="p-2 bg-slate-800/50 rounded text-center">
                <div className="text-xs text-slate-400">{item.symbol}</div>
                <div className={`text-sm font-medium ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 最新资讯 - 真实数据 */}
      <NewsSection />
    </div>
  );
}
