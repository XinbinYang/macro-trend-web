"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

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

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState<MarketQuote[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [dataSources, setDataSources] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/market-data-realtime");
      const data = await res.json();
      
      if (data.success) {
        const allData = [...(data.indices || []), ...(data.assets || [])];
        setMarketData(allData);
        setLastUpdated(data.timestamp);
        setDataSources(data.sources || {});
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 每60秒自动刷新
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const getQuote = (symbol: string) => marketData.find(q => q.symbol === symbol);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">投资仪表盘</h1>
          <p className="text-muted-foreground">
            AI宏观作手 - 全球宏观投资分析
            {lastUpdated && (
              <span className="ml-2 text-xs">
                更新于 {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(dataSources).map(([source, count]) => (
            <Badge key={source} variant="outline" className="text-xs">
              {source}: {count}
            </Badge>
          ))}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            刷新数据
          </Button>
        </div>
      </div>

      {/* 主要指数 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          ["SPY", "QQQ", "ASHR", "GLD"].map(symbol => {
            const quote = getQuote(symbol);
            if (!quote) return null;
            return (
              <Card key={symbol}>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">{quote.name}</div>
                  <div className="text-2xl font-bold">{quote.price.toFixed(2)}</div>
                  <div className={`text-sm ${quote.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    来源: {quote.source}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 更多资产 */}
      <Card>
        <CardHeader>
          <CardTitle>资产行情</CardTitle>
          <CardDescription>实时市场数据</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {marketData.map(quote => (
                <div key={quote.symbol} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{quote.symbol}</div>
                    <div className="text-xs text-muted-foreground">{quote.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{quote.price.toFixed(2)}</div>
                    <div className={`text-sm ${quote.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {quote.change >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
