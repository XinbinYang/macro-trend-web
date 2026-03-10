"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, BarChart3, ArrowUpRight, ArrowDownRight, Sparkles, CandlestickChart, Gauge, Clock, TrendingUp, BookOpen } from "lucide-react";
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
function AssetCard({ quote, isSelected, onClick }: { quote: MarketQuote; isSelected: boolean; onClick: () => void }) {
  const isPositive = quote.change >= 0;
  const regionEmoji = {
    US: "🇺🇸",
    CN: "🇨🇳",
    HK: "🇭🇰",
    GLOBAL: "🌍",
  }[quote.region];

  return (
    <Card 
      className={`bg-slate-900/50 border-slate-800 cursor-pointer transition-all hover:border-slate-700 hover:bg-slate-800/50 ${
        isSelected ? 'ring-1 ring-amber-500/50 border-amber-500/30' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{regionEmoji}</span>
            <span className="text-xs text-slate-400 truncate max-w-[60px]">{quote.name}</span>
          </div>
          <DataTypeBadge type={quote.dataType} />
        </div>
        <div className="text-lg font-bold text-slate-50">
          {quote.price.toFixed(quote.price < 10 ? 3 : 2)}
        </div>
        <div className={`flex items-center mt-1 text-xs font-medium ${
          isPositive ? "text-green-400" : "text-red-400"
        }`}>
          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
          {isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%
        </div>
        <div className="text-[9px] text-slate-600 mt-1 truncate">
          {quote.dataSource}
        </div>
      </CardContent>
    </Card>
  );
}

// 四大宏观维度配置
const macroDimensions = [
  {
    id: "growth",
    name: "增长预期",
    emoji: "📈",
    china: { status: "复苏", trend: "up", desc: "制造业PMI 50.8，重回扩张" },
    us: { status: "稳健", trend: "up", desc: "ISM 50.3，突破荣枯线" },
  },
  {
    id: "inflation",
    name: "通胀预期",
    emoji: "🔥",
    china: { status: "温和", trend: "up", desc: "CPI 0.7%，通缩压力缓解" },
    us: { status: "粘性", trend: "neutral", desc: "CPI 3.2%，高于目标" },
  },
  {
    id: "policy",
    name: "政策预期",
    emoji: "🏛️",
    china: { status: "宽松", trend: "up", desc: "降准降息，财政发力" },
    us: { status: "观望", trend: "neutral", desc: "3月FOMC，关注降息指引" },
  },
  {
    id: "liquidity",
    name: "流动性",
    emoji: "💧",
    china: { status: "充裕", trend: "up", desc: "社融4.56万亿，合理充裕" },
    us: { status: "紧缩", trend: "neutral", desc: "利率5.5%，维持高位" },
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
    return [
      ...marketData.data.us,
      ...marketData.data.china,
      ...marketData.data.hongkong,
      ...marketData.data.global,
    ].find(q => q.symbol === symbol);
  };

  // 获取所有资产列表
  const allAssets = marketData ? [
    ...marketData.data.us,
    ...marketData.data.china,
    ...marketData.data.hongkong,
    ...marketData.data.global,
  ] : [];

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

          {/* 四大宏观维度 - 中美对比 */}
          <div className="mt-4 md:mt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {macroDimensions.map((dim) => (
                <div 
                  key={dim.id}
                  className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-3 md:p-4 hover:border-slate-600 transition-colors"
                >
                  {/* 维度标题 */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50">
                    <span className="text-lg">{dim.emoji}</span>
                    <span className="text-xs font-medium text-slate-300">{dim.name}</span>
                  </div>
                  
                  {/* 中国 */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🇨🇳</span>
                      <span className={`text-sm font-bold ${
                        dim.china.trend === 'up' ? 'text-green-400' : 
                        dim.china.trend === 'down' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {dim.china.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight pl-6">{dim.china.desc}</div>
                  </div>
                  
                  {/* 美国 */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🇺🇸</span>
                      <span className={`text-sm font-bold ${
                        dim.us.trend === 'up' ? 'text-green-400' : 
                        dim.us.trend === 'down' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {dim.us.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight pl-6">{dim.us.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 核心资产 - 按地区分组 */}
      <div className="space-y-4">
        {/* 美国资产 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">🇺🇸 美国市场</Badge>
            <span className="text-xs text-slate-500">
              实时数据 · Yahoo/Polygon
            </span>
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
              marketData?.data.us.map((quote) => (
                <AssetCard
                  key={quote.symbol}
                  quote={quote}
                  isSelected={selectedSymbol === quote.symbol}
                  onClick={() => setSelectedSymbol(quote.symbol)}
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
              收盘数据 · AkShare (日度更新)
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
              marketData?.data.china.map((quote) => (
                <AssetCard
                  key={quote.symbol}
                  quote={quote}
                  isSelected={selectedSymbol === quote.symbol}
                  onClick={() => setSelectedSymbol(quote.symbol)}
                />
              ))
            )}
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
                  isSelected={selectedSymbol === quote.symbol}
                  onClick={() => setSelectedSymbol(quote.symbol)}
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
                  isSelected={selectedSymbol === quote.symbol}
                  onClick={() => setSelectedSymbol(quote.symbol)}
                />
              ))
            )}
          </div>
        </div>
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
              <div className="flex gap-1 flex-wrap">
                {allAssets.slice(0, 8).map((asset) => (
                  <Button
                    key={asset.symbol}
                    variant={selectedSymbol === asset.symbol ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSymbol(asset.symbol)}
                    className={`text-xs h-7 px-2 ${
                      selectedSymbol === asset.symbol 
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500' 
                        : 'border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {asset.symbol}
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
                    dataKey="close" 
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
            <Link href="/strategies">
              <Button className="w-full justify-start gap-3 h-auto py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-medium">
                <TrendingUp className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm">策略净值</div>
                  <div className="text-[10px] opacity-80">Beta 7.0 / Alpha 2.0 / Mix组合</div>
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