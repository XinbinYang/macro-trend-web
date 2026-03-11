"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoricalPoint {
  date: string;
  price: number;
  high?: number;
  low?: number;
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
  "^GSPC": "标普500指数",
  "^NDX": "纳斯达克100指数",
  "^DJI": "道琼斯工业指数",

  "TLT": "20年+美国国债(ETF proxy)",
  "GLD": "SPDR黄金ETF(ETF proxy)",

  "EEM": "新兴市场 ETF",
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
  const symbol = decodeURIComponent(params.symbol as string);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("1y");
  const [isLoading, setIsLoading] = useState(true);
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalPoint[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  // 获取实时数据和历史数据
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 获取更多历史数据用于计算技术指标 (需要252天计算MA200和52周高低)
      const fetchDays = timeRange === "7d" ? 30 : timeRange === "30d" ? 90 : timeRange === "90d" ? 252 : 365;
      
      // 并行获取实时数据和历史数据
      const [realtimeRes, historicalRes] = await Promise.all([
        fetch("/api/market-data-realtime"),
        fetch(`/api/historical-data?symbol=${symbol}&days=${fetchDays}`),
      ]);

      const realtimeData = await realtimeRes.json();
      const historicalData = await historicalRes.json();

      // 从实时数据中找到当前资产
      if (realtimeData.success && realtimeData.data) {
        const allQuotes = [
          ...realtimeData.data.us,
          ...realtimeData.data.china,
          ...realtimeData.data.hongkong,
          ...realtimeData.data.global,
        ];
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

  // 获取AI解读
  const fetchAIInsight = async () => {
    if (!quote) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${assetName} (${symbol})`,
          titleEn: `${assetName} (${symbol}) - Price: $${quote.price.toFixed(2)}, Change: ${quote.changePercent.toFixed(2)}%`,
          source: quote.source
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setAiInsight(`${data.data.summary} 影响: ${data.data.impact}。建议: ${data.data.suggestion}`);
      } else {
        setAiInsight(data?.error || "AI 解读暂不可用（需要 OPENROUTER_API_KEY）");
      }
    } catch {
      setAiInsight("AI 解读暂不可用");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeRange]);

  useEffect(() => {
    if (quote && !aiInsight) {
      fetchAIInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

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

  // 计算区间收益率
  const calculateReturn = (data: HistoricalPoint[], days: number): number | null => {
    if (data.length < 2) return null;
    const endIdx = data.length - 1;
    const startIdx = Math.max(0, endIdx - days + 1);
    const startPrice = data[startIdx]?.price;
    const endPrice = data[endIdx]?.price;
    if (!startPrice || !endPrice) return null;
    return ((endPrice - startPrice) / startPrice) * 100;
  };

  // 计算最大回撤
  const calculateMaxDrawdown = (data: HistoricalPoint[]): number | null => {
    if (data.length < 2) return null;
    let maxDrawdown = 0;
    let peak = data[0]?.price;
    
    for (const point of data) {
      if (point.price > peak) {
        peak = point.price;
      }
      const drawdown = ((peak - point.price) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    return maxDrawdown;
  };

  // 获取过去N个交易日的日期范围对应的数据
  const getDataForRange = (data: HistoricalPoint[], days: number): HistoricalPoint[] => {
    if (data.length <= days) return data;
    return data.slice(-days);
  };

  const ma200 = calculateMA(historyData, 200);
  const priceVsMa200 = ma200 && quote ? ((quote.price - ma200) / ma200) * 100 : 0;
  
  // 52周高低点 (使用最近252个交易日，如果没有则用当前数据)
  const high52w = historyData.length > 0 ? Math.max(...historyData.map(d => d.price)) : (quote?.price || 0);
  const low52w = historyData.length > 0 ? Math.min(...historyData.map(d => d.price)) : (quote?.price || 0);

  // 收益率计算
  const return1M = calculateReturn(historyData, 21);  // 约21交易日
  const return3M = calculateReturn(historyData, 63);  // 约63交易日  
  const return1Y = calculateReturn(historyData, 252); // 约252交易日

  // 最大回撤计算 (使用选择的时间范围)
  const selectedRangeDays = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 252;
  const selectedRangeData = getDataForRange(historyData, selectedRangeDays);
  const maxDrawdownSelected = calculateMaxDrawdown(selectedRangeData);

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
                <h1 className="text-xl sm:text-2xl font-bold">{assetName}</h1>
                <span className="text-sm text-muted-foreground font-mono">{symbol}</span>
              </div>
              <Badge variant={signal.direction === "bullish" ? "default" : signal.direction === "bearish" ? "destructive" : "secondary"}>
                {signal.direction === "bullish" ? "看涨" : signal.direction === "bearish" ? "看跌" : "中性"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
            
            {/* AI解读 */}
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-400">AI 解读</span>
                {aiLoading && <span className="text-xs text-slate-500">分析中...</span>}
              </div>
              <p className="text-sm text-slate-300">
                {aiLoading ? "正在生成AI分析..." : aiInsight || "加载中..."}
              </p>
            </div>
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
              来源: {quote.source}{quote.source?.includes("Eastmoney") || symbol.match(/^\d{6}\.(SH|SZ)$/i) ? " (Indicative)" : ""} · 更新于 {new Date(quote.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* 关键指标 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">200日均线</div>
            <div className="text-base sm:text-lg font-mono font-medium">{ma200 ? ma200.toFixed(2) : "-"}</div>
            {ma200 && (
              <div className={`text-xs ${priceVsMa200 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceVsMa200 >= 0 ? "+" : ""}{priceVsMa200.toFixed(1)}%
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">52周最高</div>
            <div className="text-base sm:text-lg font-mono font-medium">{high52w.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">52周最低</div>
            <div className="text-base sm:text-lg font-mono font-medium">{low52w.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">1个月收益</div>
            <div className={`text-base sm:text-lg font-mono font-medium ${return1M !== null ? (return1M >= 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
              {return1M !== null ? `${return1M >= 0 ? '+' : ''}${return1M.toFixed(1)}%` : '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">3个月收益</div>
            <div className={`text-base sm:text-lg font-mono font-medium ${return3M !== null ? (return3M >= 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
              {return3M !== null ? `${return3M >= 0 ? '+' : ''}${return3M.toFixed(1)}%` : '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">1年收益</div>
            <div className={`text-base sm:text-lg font-mono font-medium ${return1Y !== null ? (return1Y >= 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
              {return1Y !== null ? `${return1Y >= 0 ? '+' : ''}${return1Y.toFixed(1)}%` : '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">最大回撤</div>
            <div className="text-base sm:text-lg font-mono font-medium text-red-500">
              {maxDrawdownSelected !== null ? `-${maxDrawdownSelected.toFixed(1)}%` : '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">成交量</div>
            <div className="text-base sm:text-base sm:text-lg font-mono font-medium">{(quote.volume / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        {/* 元信息（移动端容易溢出，单独一行） */}
        <div className="grid grid-cols-2 gap-4 mt-4"> 
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">数据源</div>
            <div className="text-sm sm:text-base font-mono font-medium truncate" title={quote.source}>{quote.source}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">信号强度</div>
            <div className="text-sm sm:text-base font-mono font-medium">
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
          <div className="h-[300px] w-full min-h-[300px]">
            {historyData.length > 0 ? (
              <div className="w-full h-full min-h-[300px]">
                <ResponsiveContainer width="99%" height="100%">
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
              </div>
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
