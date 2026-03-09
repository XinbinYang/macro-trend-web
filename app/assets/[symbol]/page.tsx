"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts";
import { SignalBadge } from "@/components/terminal-cards";

// 模拟资产详情数据
const mockAssetDetail: Record<string, {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  direction: "bullish" | "bearish" | "neutral";
  ma200: number;
  priceVsMa200: number;
  high52w: number;
  low52w: number;
  volume: string;
  marketCap: string;
  peRatio: string;
  description: string;
  keySupport: string;
  keyResistance: string;
  priceHistory: { date: string; price: number; volume: number }[];
  analysis: {
    dimension: string;
    dimensionName: string;
    perspective: string;
    keyInsight: string;
  }[];
  tradeStrategy: {
    direction: string;
    entryRange: string;
    stopLoss: string;
    target: string;
    riskRewardRatio: string;
    timeFrame: string;
  };
}> = {
  "GC=F": {
    symbol: "GC=F",
    name: "黄金期货",
    price: 2865.40,
    change: 35.25,
    changePercent: 1.25,
    direction: "bullish",
    ma200: 2650.50,
    priceVsMa200: 8.1,
    high52w: 2880.00,
    low52w: 1980.50,
    volume: "12.5万手",
    marketCap: "-",
    peRatio: "-",
    description: "黄金是全球最重要的避险资产之一，价格受实际利率、美元汇率、地缘风险等多重因素影响。当前处于历史性突破阶段。",
    keySupport: "2750美元",
    keyResistance: "3000美元",
    priceHistory: Array.from({ length: 90 }, (_, i) => ({
      date: new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 2650 + Math.random() * 230 + i * 2.4,
      volume: Math.floor(100000 + Math.random() * 50000),
    })),
    analysis: [
      {
        dimension: "cycle",
        dimensionName: "周期分析",
        perspective: "全球经济处于扩张周期后期，逐步向滞胀阶段过渡。",
        keyInsight: "滞胀环境利好黄金，实际利率下行提供上涨动力",
      },
      {
        dimension: "reflexivity",
        dimensionName: "反身性分析",
        perspective: "市场主流预期从'通胀暂时论'转向'通胀长期化'。",
        keyInsight: "预期差为黄金提供额外上涨空间",
      },
      {
        dimension: "liquidity",
        dimensionName: "流动性分析",
        perspective: "美联储即将启动降息周期，实际利率下行。",
        keyInsight: "实际利率与金价负相关，降息周期支撑金价",
      },
      {
        dimension: "technical",
        dimensionName: "技术趋势",
        perspective: "突破历史新高，200日均线上方强势运行。",
        keyInsight: "技术形态健康，趋势延续概率高",
      },
    ],
    tradeStrategy: {
      direction: "做多",
      entryRange: "2850-2900美元",
      stopLoss: "2750美元",
      target: "3100美元",
      riskRewardRatio: "3:1",
      timeFrame: "3-6个月",
    },
  },
  "SPY": {
    symbol: "SPY",
    name: "标普500 ETF",
    price: 595.23,
    change: 5.02,
    changePercent: 0.85,
    direction: "bullish",
    ma200: 560.50,
    priceVsMa200: 6.2,
    high52w: 598.50,
    low52w: 495.20,
    volume: "8500万股",
    marketCap: "-",
    peRatio: "24.5",
    description: "SPY是全球最大的ETF之一，追踪标普500指数，涵盖美国大型蓝筹股，是美股市场最重要的基准指标。",
    keySupport: "580美元",
    keyResistance: "610美元",
    priceHistory: Array.from({ length: 90 }, (_, i) => ({
      date: new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 550 + Math.random() * 45 + i * 0.5,
      volume: Math.floor(80000000 + Math.random() * 20000000),
    })),
    analysis: [
      {
        dimension: "cycle",
        dimensionName: "周期分析",
        perspective: "美国经济呈现K型分化，制造业疲软但服务业强劲。",
        keyInsight: "软着陆概率上升，盈利预期改善",
      },
      {
        dimension: "reflexivity",
        dimensionName: "反身性分析",
        perspective: "市场对AI革命的乐观预期部分已反映在估值中。",
        keyInsight: "需区分AI受益者和伪概念股",
      },
      {
        dimension: "liquidity",
        dimensionName: "流动性分析",
        perspective: "美联储即将降息，流动性环境改善。",
        keyInsight: "流动性宽松利好成长股",
      },
      {
        dimension: "technical",
        dimensionName: "技术趋势",
        perspective: "突破前期高点，200日均线上方运行。",
        keyInsight: "趋势健康，但短期或需整固",
      },
    ],
    tradeStrategy: {
      direction: "做多",
      entryRange: "590-600美元",
      stopLoss: "575美元",
      target: "630美元",
      riskRewardRatio: "2.5:1",
      timeFrame: "3-6个月",
    },
  },
};

export default function AssetDetailPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("90d");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取资产数据（实际应从API获取）
  const asset = mockAssetDetail[symbol] || {
    symbol,
    name: symbol,
    price: 100,
    change: 0,
    changePercent: 0,
    direction: "neutral",
    ma200: 95,
    priceVsMa200: 5,
    high52w: 120,
    low52w: 80,
    volume: "-",
    marketCap: "-",
    peRatio: "-",
    description: "暂无详细数据",
    keySupport: "-",
    keyResistance: "-",
    priceHistory: [],
    analysis: [],
    tradeStrategy: {
      direction: "观望",
      entryRange: "-",
      stopLoss: "-",
      target: "-",
      riskRewardRatio: "-",
      timeFrame: "-",
    },
  };

  const isUp = asset.changePercent >= 0;
  const colorClass = isUp ? "text-data-up" : "text-data-down";

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // 根据时间范围过滤数据
  const filteredData = asset.priceHistory.slice(-(
    timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365
  ));

  return (
    <div className="space-y-4">
      {/* 返回导航 */}
      <div className="flex items-center gap-2">
        <Link 
          href="/assets" 
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回资产列表
        </Link>
      </div>

      {/* 资产头部信息 */}
      <div className="card-terminal">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-terminal-bg-tertiary rounded flex items-center justify-center text-sm font-bold text-text-secondary">
                  {asset.symbol.slice(0, 2)}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-text-primary">{asset.name}</h1>
                  <span className="text-sm font-mono text-text-muted">{asset.symbol}</span>
                </div>
              </div>
              <p className="text-sm text-text-secondary mt-2 max-w-2xl">{asset.description}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-text-primary">
                {asset.price.toFixed(2)}
              </div>
              <div className={`text-sm font-mono ${colorClass}`}>
                {isUp ? "+" : ""}{asset.change.toFixed(2)} ({isUp ? "+" : ""}{asset.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* 关键指标 */}
          <div className="grid grid-cols-6 gap-4 mt-4 pt-4 border-t border-terminal-border">
            <div className="text-center">
              <div className="text-2xs text-text-muted uppercase">200日均线</div>
              <div className="text-sm font-mono text-text-primary">{asset.ma200.toFixed(2)}</div>
              <div className={`text-xs font-mono ${asset.priceVsMa200 >= 0 ? 'text-data-up' : 'text-data-down'}`}>
                {asset.priceVsMa200 >= 0 ? "+" : ""}{asset.priceVsMa200.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xs text-text-muted uppercase">52周最高</div>
              <div className="text-sm font-mono text-text-primary">{asset.high52w.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-2xs text-text-muted uppercase">52周最低</div>
              <div className="text-sm font-mono text-text-primary">{asset.low52w.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-2xs text-text-muted uppercase">成交量</div>
              <div className="text-sm font-mono text-text-primary">{asset.volume}</div>
            </div>
            <div className="text-center">
              <div className="text-2xs text-text-muted uppercase">市值</div>
              <div className="text-sm font-mono text-text-primary">{asset.marketCap}</div>
            </div>
            <div className="text-center">
              <div className="text-2xs text-text-muted uppercase">市盈率</div>
              <div className="text-sm font-mono text-text-primary">{asset.peRatio}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 价格图表 */}
      <div className="card-terminal">
        <div className="card-header">
          <span>价格走势</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["7d", "30d", "90d", "1y"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 py-0.5 rounded text-2xs transition-colors ${
                    timeRange === range
                      ? "bg-signal-cyan/10 text-signal-cyan"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button 
              onClick={handleRefresh}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isUp ? "#00C853" : "#FF5252"} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={isUp ? "#00C853" : "#FF5252"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6E7681" 
                  tick={{ fill: '#6E7681', fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis 
                  stroke="#6E7681" 
                  tick={{ fill: '#6E7681', fontSize: 10 }}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isUp ? "#00C853" : "#FF5252"}
                  strokeWidth={2}
                  fill={`url(#gradient-${symbol})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 四维度分析 */}
      <div className="grid-terminal">
        {asset.analysis.map((item, index) => (
          <div key={index} className="col-span-6 card-terminal">
            <div className="card-header">
              <SignalBadge 
                signal={asset.direction} 
                strength={index === 0 ? "strong" : "moderate"}
              >
                {item.dimensionName}
              </SignalBadge>
            </div>
            <div className="p-3 space-y-2">
              <p className="text-sm text-text-secondary">{item.perspective}</p>
              <div className="flex items-start gap-2 pt-2 border-t border-terminal-border/50">
                <span className="text-signal-cyan text-xs">💡</span>
                <p className="text-xs text-text-primary">{item.keyInsight}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 交易策略 */}
      <div className="card-terminal">
        <div className="card-header">
          <SignalBadge signal={asset.direction} strength="strong">
            交易策略
          </SignalBadge>
          <span className="text-xs text-text-muted">{asset.tradeStrategy.timeFrame}</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xs text-text-muted uppercase mb-1">方向</div>
              <div className={`text-sm font-medium ${asset.tradeStrategy.direction === '做多' ? 'text-data-up' : asset.tradeStrategy.direction === '做空' ? 'text-data-down' : 'text-text-secondary'}`}>
                {asset.tradeStrategy.direction}
              </div>
            </div>
            <div>
              <div className="text-2xs text-text-muted uppercase mb-1">入场区间</div>
              <div className="text-sm font-mono text-text-primary">{asset.tradeStrategy.entryRange}</div>
            </div>
            <div>
              <div className="text-2xs text-text-muted uppercase mb-1">止损</div>
              <div className="text-sm font-mono text-data-down">{asset.tradeStrategy.stopLoss}</div>
            </div>
            <div>
              <div className="text-2xs text-text-muted uppercase mb-1">目标</div>
              <div className="text-sm font-mono text-data-up">{asset.tradeStrategy.target}</div>
            </div>
            <div>
              <div className="text-2xs text-text-muted uppercase mb-1">风险回报比</div>
              <div className="text-sm font-mono text-signal-cyan">{asset.tradeStrategy.riskRewardRatio}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 关键价位 */}
      <div className="grid-terminal">
        <div className="col-span-6 card-terminal">
          <div className="card-header">关键支撑位</div>
          <div className="p-3">
            <div className="text-lg font-mono text-data-down">{asset.keySupport}</div>
            <p className="text-xs text-text-muted mt-1">跌破支撑位可能加速下跌，建议减仓</p>
          </div>
        </div>
        <div className="col-span-6 card-terminal">
          <div className="card-header">关键阻力位</div>
          <div className="p-3">
            <div className="text-lg font-mono text-data-up">{asset.keyResistance}</div>
            <p className="text-xs text-text-muted mt-1">突破阻力位可能开启新一轮上涨</p>
          </div>
        </div>
      </div>
    </div>
  );
}
