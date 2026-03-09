"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoricalPoint {
  date: string;
  price: number;
}

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

// 信号分析
function analyzeSignal(changePercent: number): { direction: "bullish" | "bearish" | "neutral"; strength: "strong" | "moderate" | "weak" } {
  if (changePercent > 1.5) return { direction: "bullish", strength: "strong" };
  if (changePercent > 0.5) return { direction: "bullish", strength: "moderate" };
  if (changePercent < -1.5) return { direction: "bearish", strength: "strong" };
  if (changePercent < -0.5) return { direction: "bearish", strength: "moderate" };
  return { direction: "neutral", strength: "weak" };
}

// 资产名称映射
const ASSET_NAMES: Record<string, string> = {
  "SPY": "标普500 ETF",
  "QQQ": "纳斯达克100 ETF",
  "IWM": "罗素2000 ETF",
  "TLT": "20年+美国国债",
  "GLD": "SPDR黄金ETF",
  "ASHR": "沪深300 ETF",
  "KWEB": "中概互联网 ETF",
  "FXI": "中国大盘 ETF",
  "EEM": "新兴市场 ETF",
  "EWH": "MSCI香港 ETF",
  "GC=F": "黄金期货",
  "CL=F": "WTI原油期货",
};

// 资产描述
const ASSET_DESCRIPTIONS: Record<string, string> = {
  "SPY": "SPY是全球最大的ETF之一，追踪标普500指数，涵盖美国大型蓝筹股，是美股市场最重要的基准指标。",
  "QQQ": "追踪纳斯达克100指数，重仓科技股，包括苹果、微软、英伟达等科技巨头。",
  "GLD": "全球最大的黄金ETF，直接持有实物黄金，是投资黄金最便捷的方式。",
  "GC=F": "COMEX黄金期货，全球黄金定价基准，受实际利率、美元汇率、地缘风险影响。",
  "CL=F": "WTI原油期货，全球最重要的原油定价基准之一，反映美国原油市场供需。",
};

export default function AssetDetailPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("90d");
  const [isLoading, setIsLoading] = useState(true);
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalPoint[]>([]);

  // 获取实时数据和历史数据
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 并行获取实时数据和历史数据
      const [realtimeRes, historicalRes] = await Promise.all([
        fetch("/api/market-data-realtime"),
        fetch(`/api/historical-data?symbol=${symbol}&days=${timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 252}`),
      ]);

      const realtimeData = await realtimeRes.json();
      const historicalData = await historicalRes.json();

      // 从实时数据中找到当前资产
      if (realtimeData.success) {
        const allQuotes = [...realtimeData.indices, ...realtimeData.assets];
        const currentQuote = allQuotes.find((q: MarketQuote) => q.symbol === symbol);
        if (currentQuote) {
          setQuote(currentQuote);
        }
      }

      // 设置历史数据
      if (historicalData.success) {
        setHistoryData(historicalData.data);
      }
    } catch (error) {
      console.error("[AssetDetail] Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeRange]);

  const assetName = ASSET_NAMES[symbol] || symbol;
  const description = ASSET_DESCRIPTIONS[symbol] || `${symbol} 是全球重要金融资产之一。`;
  
  const isUp = quote ? quote.changePercent >= 0 : true;
  const signal = quote ? analyzeSignal(quote.changePercent) : { direction: "neutral" as const, strength: "weak" as const };

  // 计算技术指标
  const calculateMA = (data: HistoricalPoint[], period: number) => {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    const sum = slice.reduce((acc, d) => acc + d.price, 0);
    return sum / period;
  };

  const ma200 = calculateMA(historyData, 200);
  const priceVsMa200 = ma200 && quote ? ((quote.price - ma200) / ma200) * 100 : 0;
  
  const high52w = historyData.length > 0 ? Math.max(...historyData.map(d => d.price)) : (quote?.price || 0);
  const low52w = historyData.length > 0 ? Math.min(...historyData.map(d => d.price)) : (quote?.price || 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="space-y-4">
        <Link href="/assets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          返回资产列表
        </Link>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-2">暂无数据</h1>
          <p className="text-muted-foreground">该资产暂无实时数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回导航 */}
      <div className="flex items-center gap-2">
        <Link 
          href="/assets" 
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回资产列表
        </Link>
      </div>

      {/* 资产头部信息 */}
      <div className="border rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{symbol.slice(0, 2)}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{assetName}</h1>
                <span className="text-sm text-muted-foreground font-mono">{symbol}</span>
              </div>
              <Badge variant={signal.direction === "bullish" ? "default" : signal.direction === "bearish" ? "destructive" : "secondary"}>
                {signal.direction === "bullish" ? "看涨" : signal.direction === "bearish" ? "看跌" : "中性"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold font-mono">
              ${quote.price.toFixed(2)}
            </div>
            <div className={`flex items-center justify-end gap-1 text-sm font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUp ? "+" : ""}{quote.change.toFixed(2)} ({isUp ? "+" : ""}{quote.changePercent.toFixed(2)}%)
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              来源: {quote.source} · 更新于 {new Date(quote.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* 关键指标 */}
        <div className="grid grid-cols-6 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">200日均线</div>
            <div className="text-lg font-mono font-medium">{ma200 ? ma200.toFixed(2) : "-"}</div>
            {ma200 && (
              <div className={`text-xs ${priceVsMa200 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceVsMa200 >= 0 ? "+" : ""}{priceVsMa200.toFixed(1)}%
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">52周最高</div>
            <div className="text-lg font-mono font-medium">{high52w.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">52周最低</div>
            <div className="text-lg font-mono font-medium">{low52w.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">成交量</div>
            <div className="text-lg font-mono font-medium">{(quote.volume / 1000000).toFixed(1)}M</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">数据源</div>
            <div className="text-lg font-mono font-medium">{quote.source}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">信号强度</div>
            <div className="text-lg font-mono font-medium">
              {signal.strength === "strong" ? "强" : signal.strength === "moderate" ? "中" : "弱"}
            </div>
          </div>
        </div>
      </div>

      {/* 价格图表 */}
      <div className="border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">价格走势</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["7d", "30d", "90d", "1y"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    timeRange === range
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button 
              onClick={fetchData}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="h-[300px]">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value.slice(5)}
                    className="text-xs"
                  />
                  <YAxis 
                    className="text-xs"
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => value.toFixed(0)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))'
                    }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, "价格"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={isUp ? "#22c55e" : "#ef4444"}
                    strokeWidth={2}
                    fill={`url(#gradient-${symbol})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                暂无历史数据
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 四维度分析 */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            dimension: "周期分析",
            perspective: "全球经济处于扩张周期后期，逐步向滞胀阶段过渡。",
            insight: "当前周期位置对风险资产影响中性偏正面。",
          },
          {
            dimension: "反身性分析",
            perspective: "市场主流预期与基本面存在一定预期差。",
            insight: "关注预期修正带来的交易机会。",
          },
          {
            dimension: "流动性分析",
            perspective: "主要央行货币政策趋于宽松，流动性环境改善。",
            insight: "流动性宽松利好风险资产。",
          },
          {
            dimension: "技术趋势",
            perspective: quote ? `当前价格${priceVsMa200 > 0 ? '高于' : '低于'}200日均线${Math.abs(priceVsMa200).toFixed(1)}%。` : "技术指标显示当前趋势。",
            insight: priceVsMa200 > 5 ? "强势上涨，趋势延续概率高" : priceVsMa200 < -5 ? "弱势下跌，需谨慎" : "震荡整理，等待方向选择",
          },
        ].map((item, index) => (
          <div key={index} className="border rounded-lg">
            <div className="p-4 border-b">
              <Badge variant="outline">{item.dimension}</Badge>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-muted-foreground">{item.perspective}</p>
              <div className="flex items-start gap-2 pt-2 border-t">
                <span className="text-primary">💡</span>
                <p className="text-sm">{item.insight}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 关键价位 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-2">关键支撑位</div>
          <div className="text-2xl font-mono font-bold text-red-600">
            ${(low52w + (high52w - low52w) * 0.3).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">跌破支撑位可能加速下跌，建议减仓</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-2">关键阻力位</div>
          <div className="text-2xl font-mono font-bold text-green-600">
            ${(high52w * 1.05).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">突破阻力位可能开启新一轮上涨</p>
        </div>
      </div>
    </div>
  );
}
