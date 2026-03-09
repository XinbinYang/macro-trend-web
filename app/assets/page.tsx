"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

// 资产类别配置
const assetClasses = [
  { id: "cn_stocks", label: "中国股票", flag: "🇨🇳", symbols: ["ASHR", "KWEB", "MCHI", "FXI"] },
  { id: "cn_bonds", label: "中国债券", flag: "🇨🇳", symbols: ["CBON"] },
  { id: "us_stocks", label: "美国股票", flag: "🇺🇸", symbols: ["SPY", "QQQ", "IWM"] },
  { id: "us_bonds", label: "美国债券", flag: "🇺🇸", symbols: ["TLT", "IEF", "HYG"] },
  { id: "gold", label: "黄金", flag: "🌐", symbols: ["GC=F", "GLD"] },
  { id: "other", label: "其他市场", flag: "🌐", symbols: ["EEM", "CL=F", "EWH"] },
];

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

// 信号分析（基于价格变动）
function analyzeSignal(changePercent: number): { direction: "bullish" | "bearish" | "neutral"; strength: "strong" | "moderate" | "weak" } {
  if (changePercent > 1.5) return { direction: "bullish", strength: "strong" };
  if (changePercent > 0.5) return { direction: "bullish", strength: "moderate" };
  if (changePercent < -1.5) return { direction: "bearish", strength: "strong" };
  if (changePercent < -0.5) return { direction: "bearish", strength: "moderate" };
  return { direction: "neutral", strength: "weak" };
}

const directionIcons = {
  bullish: <TrendingUp className="h-4 w-4 text-green-600" />,
  bearish: <TrendingDown className="h-4 w-4 text-red-600" />,
  neutral: <Minus className="h-4 w-4 text-gray-600" />,
};

const strengthLabels = {
  strong: "强",
  moderate: "中",
  weak: "弱",
};

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("cn_stocks");
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
        setError(data.sources ? "数据获取失败" : "无可用数据");
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
    // 每60秒自动刷新
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, []);

  // 获取所有报价
  const allQuotes = marketData ? [...marketData.indices, ...marketData.assets] : [];
  
  // 按类别获取资产
  const getAssetsByClass = (classId: string) => {
    const cls = assetClasses.find(c => c.id === classId);
    if (!cls) return [];
    return allQuotes.filter(q => cls.symbols.includes(q.symbol));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">资产列表</h1>
          <p className="text-muted-foreground">
            六大资产板块实时行情与分析
            {marketData?.timestamp && (
              <span className="ml-2 text-xs">
                更新于 {new Date(marketData.timestamp).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {marketData?.sources && Object.entries(marketData.sources).map(([source, count]) => (
            <Badge key={source} variant="secondary" className="text-xs">
              {source}: {count}
            </Badge>
          ))}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
          {error}，请稍后重试
        </div>
      )}

      {/* 资产类别标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6">
          {assetClasses.map((cls) => (
            <TabsTrigger key={cls.id} value={cls.id} className="text-sm">
              <span className="mr-1">{cls.flag}</span>
              {cls.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {assetClasses.map((cls) => {
          const assets = getAssetsByClass(cls.id);
          return (
            <TabsContent key={cls.id} value={cls.id} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{cls.flag}</span>
                    {cls.label}
                  </CardTitle>
                  <CardDescription>
                    {assets.length} 个相关标的
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assets.map((asset) => {
                        const signal = analyzeSignal(asset.changePercent);
                        return (
                          <Link 
                            key={asset.symbol}
                            href={`/assets/${asset.symbol}`}
                            className="block"
                          >
                            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <span className="text-xs font-bold text-primary">
                                    {asset.symbol.slice(0, 4)}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium">{asset.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {asset.symbol} · 来源: {asset.source}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <div className="font-mono font-medium">${asset.price.toFixed(2)}</div>
                                  <div className={`text-sm ${asset.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {asset.changePercent >= 0 ? "+" : ""}{asset.changePercent.toFixed(2)}%
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {directionIcons[signal.direction]}
                                  <Badge variant="outline" className="text-xs">
                                    {strengthLabels[signal.strength]}
                                  </Badge>
                                </div>
                                
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* 资产分析说明 */}
      <Card>
        <CardHeader>
          <CardTitle>资产分析说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium mb-2">信号方向</div>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span>看涨 - 建议关注或配置</span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-gray-600" />
                  <span>中性 - 观望或维持现状</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span>看跌 - 建议减仓或对冲</span>
                </div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">信号强度</div>
              <div className="space-y-1 text-muted-foreground">
                <div><span className="font-medium">强</span> - 高置信度信号</div>
                <div><span className="font-medium">中</span> - 中等置信度</div>
                <div><span className="font-medium">弱</span> - 需进一步确认</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">分析维度</div>
              <div className="space-y-1 text-muted-foreground">
                <div>• 周期分析 - 经济周期位置</div>
                <div>• 反身性 - 市场预期差</div>
                <div>• 流动性 - 央行政策影响</div>
                <div>• 技术趋势 - 价格行为</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
