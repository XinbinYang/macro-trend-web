"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";

// 模拟数据 - 实际应从API获取
const mockMacroData = {
  chinaScenario: {
    scenario: "stagflation",
    scenarioLabel: "滞胀",
    scenarioDescription: "增长放缓 + 通胀压力",
    confidence: 75,
    liquidityTrend: "bearish",
    growthOutlook: "bearish",
    inflationOutlook: "bullish",
    policyStance: "宽松货币政策",
  },
  usScenario: {
    scenario: "goldilocks",
    scenarioLabel: "金发姑娘",
    scenarioDescription: "稳健增长 + 温和通胀",
    confidence: 68,
    liquidityTrend: "neutral",
    growthOutlook: "bullish",
    inflationOutlook: "neutral",
    policyStance: "数据依赖式降息",
  },
  assetSignals: [
    { assetClass: "cn_stocks", label: "中国股票", direction: "bearish", strength: "moderate", summary: "政策托底，估值偏低" },
    { assetClass: "cn_bonds", label: "中国债券", direction: "bullish", strength: "strong", summary: "宽松预期，利率下行" },
    { assetClass: "us_stocks", label: "美国股票", direction: "bullish", strength: "moderate", summary: "科技主导，盈利稳健" },
    { assetClass: "us_bonds", label: "美国债券", direction: "neutral", strength: "weak", summary: "收益率震荡，方向不明" },
    { assetClass: "gold", label: "黄金", direction: "bullish", strength: "strong", summary: "避险需求，央行购金" },
    { assetClass: "other_markets", label: "其他市场", direction: "neutral", strength: "moderate", summary: "分化加剧，精选个股" },
  ],
};

const scenarioColors: Record<string, { bg: string; text: string; border: string }> = {
  inflation: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  deflation: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  goldilocks: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  stagflation: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
};

const directionIcons = {
  bullish: <TrendingUp className="h-4 w-4" />,
  bearish: <TrendingDown className="h-4 w-4" />,
  neutral: <Minus className="h-4 w-4" />,
};

const directionColors = {
  bullish: "bg-green-100 text-green-700 border-green-200",
  bearish: "bg-red-100 text-red-700 border-red-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">投资仪表盘</h1>
          <p className="text-muted-foreground">AI宏观作手 - 全球宏观投资分析</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          刷新数据
        </Button>
      </div>

      {/* 宏观情景概览 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 中国宏观情景 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">🇨🇳</span>
              中国宏观情景
            </CardTitle>
            <CardDescription>基于实时市场数据推导</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Badge 
                    className={`text-lg px-3 py-1 ${scenarioColors[mockMacroData.chinaScenario.scenario].bg} ${scenarioColors[mockMacroData.chinaScenario.scenario].text} border-${scenarioColors[mockMacroData.chinaScenario.scenario].border}`}
                    variant="outline"
                  >
                    {mockMacroData.chinaScenario.scenarioLabel}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    置信度 {mockMacroData.chinaScenario.confidence}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {mockMacroData.chinaScenario.scenarioDescription}
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-muted-foreground">流动性</div>
                    <div className={mockMacroData.chinaScenario.liquidityTrend === "bullish" ? "text-green-600" : "text-red-600"}>
                      {mockMacroData.chinaScenario.liquidityTrend === "bullish" ? "宽松" : "收紧"}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-muted-foreground">增长</div>
                    <div className={mockMacroData.chinaScenario.growthOutlook === "bullish" ? "text-green-600" : "text-red-600"}>
                      {mockMacroData.chinaScenario.growthOutlook === "bullish" ? "上行" : "下行"}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-muted-foreground">通胀</div>
                    <div className={mockMacroData.chinaScenario.inflationOutlook === "bullish" ? "text-red-600" : "text-green-600"}>
                      {mockMacroData.chinaScenario.inflationOutlook === "bullish" ? "上行" : "下行"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 美国宏观情景 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">🇺🇸</span>
              美国宏观情景
            </CardTitle>
            <CardDescription>基于实时市场数据推导</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Badge 
                    className={`text-lg px-3 py-1 ${scenarioColors[mockMacroData.usScenario.scenario].bg} ${scenarioColors[mockMacroData.usScenario.scenario].text}`}
                    variant="outline"
                  >
                    {mockMacroData.usScenario.scenarioLabel}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    置信度 {mockMacroData.usScenario.confidence}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {mockMacroData.usScenario.scenarioDescription}
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-muted-foreground">流动性</div>
                    <div className={mockMacroData.usScenario.liquidityTrend === "bullish" ? "text-green-600" : mockMacroData.usScenario.liquidityTrend === "bearish" ? "text-red-600" : "text-yellow-600"}>
                      {mockMacroData.usScenario.liquidityTrend === "bullish" ? "宽松" : mockMacroData.usScenario.liquidityTrend === "bearish" ? "收紧" : "中性"}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-muted-foreground">增长</div>
                    <div className={mockMacroData.usScenario.growthOutlook === "bullish" ? "text-green-600" : "text-red-600"}>
                      {mockMacroData.usScenario.growthOutlook === "bullish" ? "上行" : "下行"}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-muted-foreground">通胀</div>
                    <div className={mockMacroData.usScenario.inflationOutlook === "bullish" ? "text-red-600" : mockMacroData.usScenario.inflationOutlook === "bearish" ? "text-green-600" : "text-yellow-600"}>
                      {mockMacroData.usScenario.inflationOutlook === "bullish" ? "上行" : mockMacroData.usScenario.inflationOutlook === "bearish" ? "下行" : "稳定"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 资产类别信号 */}
      <Card>
        <CardHeader>
          <CardTitle>六大资产板块信号</CardTitle>
          <CardDescription>基于宏观作手四维分析框架</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mockMacroData.assetSignals.map((signal) => (
                <Link 
                  key={signal.assetClass}
                  href={`/assets?class=${signal.assetClass}`}
                  className="block"
                >
                  <div className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${directionColors[signal.direction as keyof typeof directionColors]}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{signal.label}</span>
                      {directionIcons[signal.direction as keyof typeof directionIcons]}
                    </div>
                    <p className="text-xs opacity-80">{signal.summary}</p>
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      <span className="opacity-60">强度:</span>
                      <span className="font-medium">
                        {signal.strength === "strong" ? "强" : signal.strength === "moderate" ? "中" : "弱"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 投资组合推荐 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>风险平价组合推荐</CardTitle>
            <CardDescription>等风险贡献配置 + 宏观战术调整</CardDescription>
          </div>
          <Link href="/portfolio">
            <Button variant="outline" size="sm">
              查看详情
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">18.5%</div>
                  <div className="text-xs text-muted-foreground">预期年化收益</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">12.3%</div>
                  <div className="text-xs text-muted-foreground">年化波动率</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">1.42</div>
                  <div className="text-xs text-muted-foreground">夏普比率</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">-15%</div>
                  <div className="text-xs text-muted-foreground">最大回撤</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">战术建议:</span> 当前组合超配黄金和中国债券，低配中国股票，以应对滞胀环境。
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 市场快讯 */}
      <Card>
        <CardHeader>
          <CardTitle>市场快讯</CardTitle>
          <CardDescription>实时市场数据快照</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { symbol: "SPY", name: "标普500 ETF", price: 595.23, change: 0.85 },
                { symbol: "ASHR", name: "沪深300 ETF", price: 24.56, change: -0.32 },
                { symbol: "TLT", name: "美国长期国债", price: 89.45, change: 0.12 },
                { symbol: "GC=F", name: "黄金期货", price: 2865.40, change: 1.25 },
                { symbol: "CL=F", name: "WTI原油", price: 78.90, change: -0.85 },
              ].map((item) => (
                <div key={item.symbol} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                  <div className="flex items-center gap-3">
                    <span className="font-medium w-16">{item.symbol}</span>
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono">${item.price.toFixed(2)}</span>
                    <span className={`text-sm w-16 text-right ${item.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                    </span>
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
// Trigger rebuild 2026年 3月 9日 星期一 21時05分56秒 HKT
