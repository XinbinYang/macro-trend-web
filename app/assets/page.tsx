"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw, Clock } from "lucide-react";
import Link from "next/link";

// 资产大类配置
const assetCategories = [
  {
    id: "stocks",
    label: "股票",
    emoji: "📈",
    description: "全球主要股指ETF",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    id: "bonds",
    label: "债券",
    emoji: "📊",
    description: "国债及信用债",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  {
    id: "commodities",
    label: "商品",
    emoji: "🛢️",
    description: "贵金属及能源",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  {
    id: "fx",
    label: "外汇",
    emoji: "💱",
    description: "主要货币对",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
];

// 资产详细配置
const ASSET_CONFIG: Record<string, { name: string; category: string; region: string; dataType: string }> = {
  // 中国股票
  "ASHR": { name: "沪深300", category: "stocks", region: "CN", dataType: "DELAYED" },
  "KWEB": { name: "中概互联", category: "stocks", region: "CN", dataType: "REALTIME" },
  "FXI": { name: "富时中国50", category: "stocks", region: "CN", dataType: "REALTIME" },
  "000300.SH": { name: "沪深300", category: "stocks", region: "CN", dataType: "EOD" },
  "000905.SH": { name: "中证500", category: "stocks", region: "CN", dataType: "EOD" },
  // 港股
  "EWH": { name: "恒生指数", category: "stocks", region: "HK", dataType: "DELAYED" },
  "HSI": { name: "恒生指数", category: "stocks", region: "HK", dataType: "EOD" },
  // 美股
  "SPY": { name: "标普500", category: "stocks", region: "US", dataType: "REALTIME" },
  "QQQ": { name: "纳斯达克100", category: "stocks", region: "US", dataType: "REALTIME" },
  "IWM": { name: "罗素2000", category: "stocks", region: "US", dataType: "REALTIME" },
  // 债券
  "TLT": { name: "美债20Y", category: "bonds", region: "US", dataType: "REALTIME" },
  "IEF": { name: "美债7-10Y", category: "bonds", region: "US", dataType: "REALTIME" },
  "CN10Y": { name: "中债10Y", category: "bonds", region: "CN", dataType: "EOD" },
  // 商品
  "GLD": { name: "黄金ETF", category: "commodities", region: "GLOBAL", dataType: "REALTIME" },
  "GC=F": { name: "黄金期货", category: "commodities", region: "GLOBAL", dataType: "REALTIME" },
  "CL=F": { name: "原油期货", category: "commodities", region: "GLOBAL", dataType: "REALTIME" },
  // 外汇 (模拟)
  "UUP": { name: "美元指数", category: "fx", region: "US", dataType: "REALTIME" },
};

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
  region: string;
  category: string;
  dataType: string;
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

// 地区图标
function RegionBadge({ region }: { region: string }) {
  const colors: Record<string, string> = {
    US: "bg-blue-500 text-white",
    CN: "bg-red-500 text-white",
    HK: "bg-purple-500 text-white",
    GLOBAL: "bg-green-500 text-white",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${colors[region] || "bg-slate-500 text-white"}`}>
      {region === "GLOBAL" ? "GL" : region}
    </span>
  );
}

// 数据类型标签
function DataTypeBadge({ type }: { type: string }) {
  const configs: Record<string, { color: string; label: string }> = {
    REALTIME: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "实时" },
    DELAYED: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "延迟" },
    EOD: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "收盘" },
  };
  const config = configs[type] || configs.EOD;
  return (
    <Badge variant="outline" className={`text-[9px] ${config.color}`}>
      <Clock className="w-2.5 h-2.5 mr-0.5" />
      {config.label}
    </Badge>
  );
}

// 信号分析
function analyzeSignal(changePercent: number): { direction: "bullish" | "bearish" | "neutral"; strength: "strong" | "moderate" | "weak" } {
  if (changePercent > 1.5) return { direction: "bullish", strength: "strong" };
  if (changePercent > 0.5) return { direction: "bullish", strength: "moderate" };
  if (changePercent < -1.5) return { direction: "bearish", strength: "strong" };
  if (changePercent < -0.5) return { direction: "bearish", strength: "moderate" };
  return { direction: "neutral", strength: "weak" };
}

// 资产卡片
function AssetCard({ quote }: { quote: MarketQuote }) {
  const isPositive = quote.change >= 0;
  const signal = analyzeSignal(quote.changePercent);
  
  const signalColors = {
    bullish: "text-green-400",
    bearish: "text-red-400",
    neutral: "text-amber-400",
  };
  
  const strengthLabels = {
    strong: "强",
    moderate: "中",
    weak: "弱",
  };

  return (
    <Link href={`/assets/${quote.symbol}`}>
      <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer h-full">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <RegionBadge region={quote.region} />
              <span className="text-xs text-slate-400 truncate max-w-[70px]">{quote.name}</span>
            </div>
            <DataTypeBadge type={quote.dataType} />
          </div>
          
          <div className="text-xl font-bold text-slate-50">
            {quote.price < 10 ? quote.price.toFixed(3) : quote.price.toFixed(2)}
          </div>
          
          <div className={`flex items-center mt-1 text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
            {isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%
          </div>
          
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
            <span className="text-[9px] text-slate-600">{quote.symbol}</span>
            <span className={`text-[9px] ${signalColors[signal.direction]}`}>
              {signal.direction === "bullish" ? "看涨" : signal.direction === "bearish" ? "看跌" : "中性"}·{strengthLabels[signal.strength]}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("stocks");
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market-data-realtime");
      const data: MarketData = await res.json();
      
      if (data.success) {
        setMarketData(data);
      } else {
        setError("数据获取失败");
      }
    } catch (err) {
      setError("网络请求失败");
      console.error("[Assets] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // 获取所有资产
  const allQuotes = marketData ? [
    ...marketData.data.us,
    ...marketData.data.china,
    ...marketData.data.hongkong,
    ...marketData.data.global,
  ] : [];

  // 按类别筛选资产
  const getAssetsByCategory = (categoryId: string) => {
    return allQuotes.filter(q => {
      const config = ASSET_CONFIG[q.symbol];
      return config?.category === categoryId;
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">资产列表</h1>
          <p className="text-sm text-slate-400">
            全球大类资产配置 · {marketData?.timestamp ? new Date(marketData.timestamp).toLocaleString() : '加载中...'}
          </p>
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

      {/* 错误提示 */}
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400">
          {error}，请稍后重试
        </div>
      )}

      {/* 资产大类标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 h-auto p-1 bg-slate-900/50">
          {assetCategories.map((cat) => (
            <TabsTrigger 
              key={cat.id} 
              value={cat.id} 
              className="flex flex-col items-center gap-1 py-2 text-xs data-[state=active]:bg-slate-800"
            >
              <span className="text-lg">{cat.emoji}</span>
              <span>{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {assetCategories.map((category) => {
          const assets = getAssetsByCategory(category.id);
          return (
            <TabsContent key={category.id} value={category.id} className="mt-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.emoji}</span>
                    <div>
                      <CardTitle className="text-slate-100">{category.label}</CardTitle>
                      <CardDescription className="text-slate-500">{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full bg-slate-800" />
                      ))}
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      暂无该类别资产数据
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {assets.map((asset) => (
                        <AssetCard key={asset.symbol} quote={asset} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* 数据说明 */}
      <Card className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-amber-400 mt-0.5">💡</div>
            <div className="text-sm text-slate-300">
              <p className="font-medium text-slate-100 mb-1">数据说明</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-400">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}