"use client";

import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showArea?: boolean;
}

/**
 * 迷你趋势图组件（Sparkline）
 * 用于在紧凑空间内展示资产价格走势
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#00BCD4",
  strokeWidth = 1.5,
  showArea = true,
}: SparklineProps) {
  const { path, areaPath, min, max, isUp } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: "", areaPath: "", min: 0, max: 0, isUp: true };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // 计算每个点的坐标
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });

    // 生成折线路径
    const path = points
      .map((point, index) => {
        if (index === 0) {
          return `M ${point.x} ${point.y}`;
        }
        // 使用贝塞尔曲线平滑
        const prev = points[index - 1];
        const cp1x = prev.x + (point.x - prev.x) / 3;
        const cp1y = prev.y;
        const cp2x = prev.x + (2 * (point.x - prev.x)) / 3;
        const cp2y = point.y;
        return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
      })
      .join(" ");

    // 生成面积路径
    const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

    // 判断整体趋势
    const isUp = data[data.length - 1] >= data[0];

    return { path, areaPath, min, max, isUp };
  }, [data, width, height]);

  // 根据趋势确定颜色
  const trendColor = isUp ? "#00C853" : "#FF5252";
  const finalColor = color === "auto" ? trendColor : color;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`gradient-${finalColor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={finalColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={finalColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      
      {showArea && (
        <path
          d={areaPath}
          fill={`url(#gradient-${finalColor.replace("#", "")})`}
          stroke="none"
        />
      )}
      
      <path
        d={path}
        fill="none"
        stroke={finalColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* 终点圆点 */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / (max - min || 1)) * height}
          r={2}
          fill={finalColor}
        />
      )}
    </svg>
  );
}

/**
 * 带价格标签的趋势图
 */
export function SparklineWithPrice({
  data,
  currentPrice,
  priceChange,
  width = 80,
  height = 24,
}: SparklineProps & { currentPrice: number; priceChange: number }) {
  const isUp = priceChange >= 0;
  const color = isUp ? "#00C853" : "#FF5252";

  return (
    <div className="flex items-center gap-2">
      <Sparkline data={data} width={width} height={height} color={color} />
      <div className="text-right">
        <div className="text-sm font-mono font-medium text-text-primary">
          {currentPrice.toFixed(2)}
        </div>
        <div className={`text-xs font-mono ${isUp ? "text-data-up" : "text-data-down"}`}>
          {isUp ? "+" : ""}{priceChange.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
