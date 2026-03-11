"use client";

import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

interface KlineData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingViewChartProps {
  data: KlineData[];
  symbol: string;
  height?: number;
}

// 简化版K线组件 - 使用柱状图模拟
export function TradingViewChart({ data, symbol, height = 400 }: TradingViewChartProps) {
  // 转换数据为蜡烛图格式
  const chartData = data.map(item => {
    const isUp = item.close >= item.open;
    const bodyTop = Math.max(item.open, item.close);
    const bodyBottom = Math.min(item.open, item.close);
    
    return {
      time: item.time,
      high: item.high,
      low: item.low,
      open: item.open,
      close: item.close,
      bodyTop,
      bodyBottom,
      bodyHeight: bodyTop - bodyBottom,
      upperWick: item.high - bodyTop,
      lowerWick: bodyBottom - item.low,
      isUp,
      volume: item.volume || 0,
    };
  });

  return (
    <div style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={240}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="time" 
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
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs">
                    <div className="text-slate-400 mb-1">{d.time}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <span className="text-slate-500">开盘:</span>
                      <span className={d.isUp ? "text-green-400" : "text-red-400"}>{d.open.toFixed(2)}</span>
                      <span className="text-slate-500">最高:</span>
                      <span className="text-slate-200">{d.high.toFixed(2)}</span>
                      <span className="text-slate-500">最低:</span>
                      <span className="text-slate-200">{d.low.toFixed(2)}</span>
                      <span className="text-slate-500">收盘:</span>
                      <span className={d.isUp ? "text-green-400" : "text-red-400"}>{d.close.toFixed(2)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          
          {/* 实体部分 */}
          <Bar dataKey="bodyHeight" stackId="a" fill="#22c55e" strokeWidth={0}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isUp ? "#22c55e" : "#ef4444"}
                stroke={entry.isUp ? "#22c55e" : "#ef4444"}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* 简化提示 */}
      <div className="text-center text-xs text-slate-500 mt-2">
        {symbol} · 专业K线图表开发中 · 当前为简化预览
      </div>
    </div>
  );
}
