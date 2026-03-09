"use client";

interface HeatmapItem {
  name: string;
  symbol: string;
  change: number;
  value?: number;
}

interface SectorHeatmapProps {
  data: HeatmapItem[];
  title?: string;
}

export function SectorHeatmap({ data, title = "板块热力图" }: SectorHeatmapProps) {
  // 按涨跌幅排序
  const sortedData = [...data].sort((a, b) => b.change - a.change);
  
  // 计算颜色
  const getColor = (change: number) => {
    if (change > 5) return "bg-gradient-to-br from-green-500 to-green-600";
    if (change > 3) return "bg-gradient-to-br from-green-400 to-green-500";
    if (change > 1) return "bg-gradient-to-br from-green-300 to-green-400";
    if (change > 0) return "bg-gradient-to-br from-green-200 to-green-300";
    if (change > -1) return "bg-gradient-to-br from-red-200 to-red-300";
    if (change > -3) return "bg-gradient-to-br from-red-300 to-red-400";
    if (change > -5) return "bg-gradient-to-br from-red-400 to-red-500";
    return "bg-gradient-to-br from-red-500 to-red-600";
  };

  const getTextColor = (change: number) => {
    return Math.abs(change) > 2 ? "text-white" : "text-slate-900";
  };

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-medium text-slate-300">{title}</h3>}
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {sortedData.map((item) => (
          <div
            key={item.symbol}
            className={`relative aspect-square rounded-lg ${getColor(item.change)} 
              flex flex-col items-center justify-center p-2 cursor-pointer
              hover:scale-105 transition-transform duration-200 shadow-lg`}
          >
            <span className={`text-xs font-bold ${getTextColor(item.change)}`}>
              {item.symbol}
            </span>
            <span className={`text-[10px] ${getTextColor(item.change)} opacity-90`}>
              {item.change > 0 ? "+" : ""}{item.change.toFixed(2)}%
            </span>
            {item.value && (
              <span className={`text-[8px] mt-0.5 ${getTextColor(item.change)} opacity-75`}>
                {item.value.toFixed(0)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span>-5%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-300"></div>
          <span>-2%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-200"></div>
          <span>0%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-300"></div>
          <span>+2%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span>+5%</span>
        </div>
      </div>
    </div>
  );
}
