"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Download } from "lucide-react";
import { SignalBadge, MetricCard } from "@/components/terminal-cards";

// 组合配置数据
const portfolioAllocation = [
  { name: "中国股票", value: 15, color: "#00BCD4", signal: "bearish" as const },
  { name: "中国债券", value: 20, color: "#00C853", signal: "bullish" as const },
  { name: "美国股票", value: 25, color: "#2196F3", signal: "bullish" as const },
  { name: "美国债券", value: 15, color: "#9C27B0", signal: "neutral" as const },
  { name: "黄金", value: 20, color: "#FFD700", signal: "bullish" as const },
  { name: "大宗商品", value: 5, color: "#FF9800", signal: "bearish" as const },
];

// 组合绩效指标
const performanceMetrics = [
  { label: "预期年化收益", value: "18.5", unit: "%", trend: "up" as const, delta: "+2.1%" },
  { label: "年化波动率", value: "12.3", unit: "%", trend: "down" as const, delta: "-0.8%" },
  { label: "夏普比率", value: "1.42", unit: "", trend: "up" as const, delta: "+0.15" },
  { label: "最大回撤", value: "-15", unit: "%", trend: "up" as const, delta: "+3%" },
];

// 持仓明细
const holdings = [
  { symbol: "GC=F", name: "黄金期货", allocation: 20, price: 2865.40, changePercent: 1.25, pnl: 12.5 },
  { symbol: "QQQ", name: "纳斯达克100", allocation: 15, price: 512.45, changePercent: 1.64, pnl: 8.3 },
  { symbol: "SPY", name: "标普500", allocation: 10, price: 595.23, changePercent: 0.85, pnl: 5.2 },
  { symbol: "CBON", name: "中国债券", allocation: 20, price: 22.35, changePercent: 0.36, pnl: 3.1 },
  { symbol: "TLT", name: "美债20年", allocation: 15, price: 89.45, changePercent: 0.12, pnl: 1.8 },
];

// 回测数据
const backtestData = {
  ytd: "+8.45%",
  oneYear: "+18.32%",
  threeYear: "+42.15%",
  sinceInception: "+125.6%",
};

export default function PortfolioPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleRebalance = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="space-y-4">
      {/* 页面标题栏 */}
      <div className="flex items-center justify-between pb-2 border-b border-terminal-border">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">组合分析</h1>
          <p className="text-xs text-text-muted">风险平价组合实时监控与绩效分析</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-terminal-bg-tertiary border border-terminal-border rounded text-xs text-text-secondary hover:text-text-primary hover:border-signal-cyan transition-colors">
            <Download className="w-3.5 h-3.5" />
            导出
          </button>
          <button 
            onClick={handleRebalance}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-signal-cyan/10 border border-signal-cyan/30 rounded text-xs text-signal-cyan hover:bg-signal-cyan/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "计算中..." : "重新平衡"}
          </button>
        </div>
      </div>

      {/* 绩效指标 */}
      <div className="grid grid-cols-4 gap-3">
        {performanceMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      {/* 组合配置 + 持仓明细 */}
      <div className="grid-terminal">
        {/* 配置饼图 */}
        <div className="col-span-5 card-terminal">
          <div className="card-header">资产配置</div>
          <div className="p-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioAllocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {portfolioAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#161B22', 
                      border: '1px solid #30363D',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: '#E6EDF3' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* 图例 */}
            <div className="mt-3 space-y-1.5">
              {portfolioAllocation.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-text-secondary">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary font-mono">{item.value}%</span>
                    <SignalBadge signal={item.signal} strength="weak">
                      {item.signal === 'bullish' ? '超配' : item.signal === 'bearish' ? '低配' : '标配'}
                    </SignalBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 持仓明细 */}
        <div className="col-span-7 card-terminal">
          <div className="card-header">持仓明细</div>
          <div className="overflow-x-auto">
            <table className="table-terminal">
              <thead>
                <tr>
                  <th>代码</th>
                  <th>名称</th>
                  <th className="text-right">配置</th>
                  <th className="text-right">价格</th>
                  <th className="text-right">涨跌</th>
                  <th className="text-right">盈亏</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => {
                  const isUp = holding.changePercent >= 0;
                  return (
                    <tr key={holding.symbol}>
                      <td>
                        <span className="font-mono text-text-primary">{holding.symbol}</span>
                      </td>
                      <td className="text-text-secondary">{holding.name}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-terminal-bg-tertiary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-signal-cyan"
                              style={{ width: `${holding.allocation}%` }}
                            />
                          </div>
                          <span className="text-text-primary font-mono">{holding.allocation}%</span>
                        </div>
                      </td>
                      <td className="text-right font-mono text-text-primary">
                        {holding.price.toFixed(2)}
                      </td>
                      <td className={`text-right font-mono ${isUp ? 'text-data-up' : 'text-data-down'}`}>
                        {isUp ? '+' : ''}{holding.changePercent.toFixed(2)}%
                      </td>
                      <td className={`text-right font-mono ${holding.pnl >= 0 ? 'text-data-up' : 'text-data-down'}`}>
                        {holding.pnl >= 0 ? '+' : ''}{holding.pnl.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 回测表现 + 战术建议 */}
      <div className="grid-terminal">
        {/* 回测数据 */}
        <div className="col-span-6 card-terminal">
          <div className="card-header">回测表现</div>
          <div className="p-3">
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-terminal-bg-tertiary rounded">
                <div className="text-2xs text-text-muted uppercase mb-1">今年以来</div>
                <div className="text-lg font-mono font-bold text-data-up">{backtestData.ytd}</div>
              </div>
              <div className="text-center p-3 bg-terminal-bg-tertiary rounded">
                <div className="text-2xs text-text-muted uppercase mb-1">近1年</div>
                <div className="text-lg font-mono font-bold text-data-up">{backtestData.oneYear}</div>
              </div>
              <div className="text-center p-3 bg-terminal-bg-tertiary rounded">
                <div className="text-2xs text-text-muted uppercase mb-1">近3年</div>
                <div className="text-lg font-mono font-bold text-data-up">{backtestData.threeYear}</div>
              </div>
              <div className="text-center p-3 bg-terminal-bg-tertiary rounded">
                <div className="text-2xs text-text-muted uppercase mb-1">成立以来</div>
                <div className="text-lg font-mono font-bold text-data-up">{backtestData.sinceInception}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 战术建议 */}
        <div className="col-span-6 card-terminal">
          <div className="card-header">战术建议</div>
          <div className="p-3 space-y-3">
            <div className="flex items-start gap-3 p-2 bg-terminal-bg-tertiary rounded">
              <TrendingUp className="w-4 h-4 text-data-up mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-text-primary font-medium">增配黄金</div>
                <div className="text-xs text-text-secondary">地缘风险上升，央行持续购金，目标配置 25%</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2 bg-terminal-bg-tertiary rounded">
              <TrendingDown className="w-4 h-4 text-data-down mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-text-primary font-medium">减配中国股票</div>
                <div className="text-xs text-text-secondary">滞胀环境不利权益资产，目标配置降至 10%</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2 bg-terminal-bg-tertiary rounded">
              <Minus className="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-text-primary font-medium">维持美债配置</div>
                <div className="text-xs text-text-secondary">收益率处于高位，作为组合压舱石，保持 15%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 组合说明 */}
      <div className="card-terminal">
        <div className="card-header">策略说明</div>
        <div className="p-3 text-xs text-text-secondary space-y-2">
          <p>
            <span className="text-text-primary font-medium">风险平价策略：</span>
            基于Ledoit-Wolf协方差矩阵估算，使各资产类别对组合总风险的贡献相等，避免单一资产主导组合波动。
          </p>
          <p>
            <span className="text-text-primary font-medium">宏观战术调整：</span>
            根据当前宏观情景（滞胀/通胀/通缩/金发姑娘）动态调整配置权重，战术层占比30%，战略层占比70%。
          </p>
          <p>
            <span className="text-text-primary font-medium">再平衡规则：</span>
            
            当任何资产类别权重偏离目标超过±5%时触发再平衡，或每月定期再平衡。
          </p>
        </div>
      </div>
    </div>
  );
}
