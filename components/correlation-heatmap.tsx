"use client";

import React from "react";

// Heatmap data structure for future data-driven implementation
// interface HeatmapData {
//   labels: string[];
//   data: number[][];
// }

interface CorrelationHeatmapProps {
  assets: { symbol: string; label: string }[];
  correlationMatrix: number[][];
  width?: number;
  height?: number;
}

/**
 * 相关性热力图组件
 * 显示资产间的相关性矩阵
 */
export function CorrelationHeatmap({
  assets,
  correlationMatrix,
  width = 400,
  height = 400,
}: CorrelationHeatmapProps) {
  const n = assets.length;
  const cellSize = Math.min(width, height) / (n + 1);
  const labelSize = cellSize;

  // 颜色映射：-1 (红色) -> 0 (深色) -> 1 (绿色)
  const getColor = (value: number): string => {
    if (value > 0) {
      // 正相关：深色 -> 绿色
      const intensity = Math.min(value, 1);
      return `rgba(0, 200, 83, ${0.2 + intensity * 0.8})`;
    } else {
      // 负相关：深色 -> 红色
      const intensity = Math.min(Math.abs(value), 1);
      return `rgba(255, 82, 82, ${0.2 + intensity * 0.8})`;
    }
  };

  // 获取文字颜色
  const getTextColor = (value: number): string => {
    return Math.abs(value) > 0.5 ? "#E6EDF3" : "#8B949E";
  };

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto"
      >
        {/* 背景 */}
        <rect width={width} height={height} fill="#161B22" rx="4" />

        {/* 列标签 */}
        {assets.map((asset, i) => (
          <text
            key={`col-${i}`}
            x={labelSize + i * cellSize + cellSize / 2}
            y={labelSize / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#8B949E"
            fontSize={10}
            fontWeight="500"
          >
            {asset.symbol}
          </text>
        ))}

        {/* 行标签 */}
        {assets.map((asset, i) => (
          <text
            key={`row-${i}`}
            x={labelSize / 2}
            y={labelSize + i * cellSize + cellSize / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#8B949E"
            fontSize={10}
            fontWeight="500"
          >
            {asset.symbol}
          </text>
        ))}

        {/* 热力图单元格 */}
        {correlationMatrix.map((row, i) =>
          row.map((value, j) => (
            <g key={`cell-${i}-${j}`}>
              <rect
                x={labelSize + j * cellSize}
                y={labelSize + i * cellSize}
                width={cellSize - 1}
                height={cellSize - 1}
                fill={getColor(value)}
                rx="2"
              />
              {/* 相关系数值 */}
              <text
                x={labelSize + j * cellSize + cellSize / 2}
                y={labelSize + i * cellSize + cellSize / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={getTextColor(value)}
                fontSize={9}
                fontWeight={Math.abs(value) > 0.7 ? "600" : "400"}
              >
                {value.toFixed(2)}
              </text>
            </g>
          ))
        )}

        {/* 图例 */}
        <g transform={`translate(${width - 100}, ${height - 30})`}>
          <text x="0" y="0" fill="#8B949E" fontSize={8}>图例</text>
          {/* 负相关 */}
          <rect x="0" y="5" width="15" height="8" fill="rgba(255, 82, 82, 0.8)" rx="1" />
          <text x="18" y="12" fill="#8B949E" fontSize={7}>-1.0</text>
          
          {/* 零 */}
          <rect x="45" y="5" width="15" height="8" fill="#21262D" rx="1" />
          <text x="63" y="12" fill="#8B949E" fontSize={7}>0</text>
          
          {/* 正相关 */}
          <rect x="75" y="5" width="15" height="8" fill="rgba(0, 200, 83, 0.8)" rx="1" />
          <text x="93" y="12" fill="#8B949E" fontSize={7}>+1.0</text>
        </g>
      </svg>
    </div>
  );
}

/**
 * 简化版热力图（仅颜色，无数字）
 */
export function MiniCorrelationHeatmap({
  assets,
  correlationMatrix,
  size = 200,
}: CorrelationHeatmapProps & { size?: number }) {
  const n = assets.length;
  const cellSize = size / n;

  const getColor = (value: number): string => {
    if (value > 0) {
      const intensity = Math.min(value, 1);
      return `rgba(0, 200, 83, ${0.3 + intensity * 0.7})`;
    } else {
      const intensity = Math.min(Math.abs(value), 1);
      return `rgba(255, 82, 82, ${0.3 + intensity * 0.7})`;
    }
  };

  return (
    <svg width={size} height={size} className="rounded overflow-hidden">
      {correlationMatrix.map((row, i) =>
        row.map((value, j) => (
          <rect
            key={`mini-${i}-${j}`}
            x={j * cellSize}
            y={i * cellSize}
            width={cellSize - 0.5}
            height={cellSize - 0.5}
            fill={getColor(value)}
          />
        ))
      )}
    </svg>
  );
}
