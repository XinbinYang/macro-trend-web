"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";

// 资产类别配置
const assetClasses = [
  { id: "cn_stocks", label: "中国股票", flag: "🇨🇳" },
  { id: "cn_bonds", label: "中国债券", flag: "🇨🇳" },
  { id: "us_stocks", label: "美国股票", flag: "🇺🇸" },
  { id: "us_bonds", label: "美国债券", flag: "🇺🇸" },
  { id: "gold", label: "黄金", flag: "🌐" },
  { id: "other", label: "其他市场", flag: "🌐" },
];

// 模拟资产数据
const mockAssets: Record<string, Array<{
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  direction: "bullish" | "bearish" | "neutral";
  signalStrength: "strong" | "moderate" | "weak";
}>> = {
  cn_stocks: [
    { id: "1", symbol: "ASHR", name: "沪深300 ETF", price: 24.56, change: -0.08, changePercent: -0.32, direction: "bearish", signalStrength: "weak" },
    { id: "2", symbol: "KWEB", name: "中概互联网 ETF", price: 28.45, change: 0.35, changePercent: 1.24, direction: "bullish", signalStrength: "moderate" },
    { id: "3", symbol: "MCHI", name: "MSCI中国 ETF", price: 42.18, change: -0.25, changePercent: -0.59, direction: "bearish", signalStrength: "weak" },
    { id: "4", symbol: "FXI", name: "中国大盘 ETF", price: 26.78, change: -0.12, changePercent: -0.45, direction: "bearish", signalStrength: "weak" },
  ],
  cn_bonds: [
    { id: "5", symbol: "CBON", name: "中国债券 ETF", price: 22.35, change: 0.08, changePercent: 0.36, direction: "bullish", signalStrength: "strong" },
  ],
  us_stocks: [
    { id: "6", symbol: "SPY", name: "标普500 ETF", price: 595.23, change: 5.02, changePercent: 0.85, direction: "bullish", signalStrength: "moderate" },
    { id: "7", symbol: "QQQ", name: "纳斯达克100 ETF", price: 512.45, change: 8.25, changePercent: 1.64, direction: "bullish", signalStrength: "strong" },
    { id: "8", symbol: "IWM", name: "罗素2000 ETF", price: 225.68, change: 1.85, changePercent: 0.83, direction: "bullish", signalStrength: "moderate" },
  ],
  us_bonds: [
    { id: "9", symbol: "TLT", name: "20年+美国国债", price: 89.45, change: 0.11, changePercent: 0.12, direction: "bullish", signalStrength: "weak" },
    { id: "10", symbol: "IEF", name: "7-10年美国国债", price: 95.23, change: 0.08, changePercent: 0.08, direction: "bullish", signalStrength: "weak" },
    { id: "11", symbol: "HYG", name: "高收益债 ETF", price: 76.45, change: -0.15, changePercent: -0.20, direction: "bearish", signalStrength: "weak" },
  ],
  gold: [
    { id: "12", symbol: "GC=F", name: "黄金期货", price: 2865.40, change: 35.25, changePercent: 1.25, direction: "bullish", signalStrength: "strong" },
    { id: "13", symbol: "GLD", name: "黄金 ETF", price: 218.45, change: 2.65, changePercent: 1.23, direction: "bullish", signalStrength: "strong" },
  ],
  other: [
    { id: "14", symbol: "EEM", name: "新兴市场 ETF", price: 42.35, change: 0.35, changePercent: 0.83, direction: "bullish", signalStrength: "moderate" },
    { id: "15", symbol: "CL=F", name: "WTI原油", price: 78.90, change: -0.68, changePercent: -0.85, direction: "bearish", signalStrength: "weak" },
    { id: "16", symbol: "EURUSD=X", name: "欧元/美元", price: 1.0856, change: 0.0012, changePercent: 0.11, direction: "bullish", signalStrength: "weak" },
  ],
};

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
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cn_stocks");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">资产列表</h1>
        <p className="text-muted-foreground">六大资产板块实时行情与分析</p>
      </div>

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

        {assetClasses.map((cls) => (
          <TabsContent key={cls.id} value={cls.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{cls.flag}</span>
                  {cls.label}
                </CardTitle>
                <CardDescription>
                  {mockAssets[cls.id]?.length || 0} 个相关标的
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mockAssets[cls.id]?.map((asset) => (
                      <Link 
                        key={asset.id}
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
                              <div className="text-sm text-muted-foreground">{asset.symbol}</div>
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
                              {directionIcons[asset.direction]}
                              <Badge variant="outline" className="text-xs">
                                {strengthLabels[asset.signalStrength]}
                              </Badge>
                            </div>
                            
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
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
