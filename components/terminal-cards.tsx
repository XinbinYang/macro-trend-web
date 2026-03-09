"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MarketDataCardProps {
  title: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  extra?: string;
}

export function MarketDataCard({
  title,
  symbol,
  price,
  change,
  changePercent,
  extra,
}: MarketDataCardProps) {
  const isUp = change >= 0;
  const colorClass = isUp ? "text-data-up" : "text-data-down";
  const Icon = isUp ? TrendingUp : TrendingDown;
  const sign = isUp ? "+" : "";

  return (
    <div className="data-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="data-card-header">{title}</div>
          <div className="text-xs text-text-secondary font-mono">{symbol}</div>
        </div>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      
      <div className="data-card-value text-text-primary">
        {price.toLocaleString("zh-CN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
      
      <div className={`data-card-change ${colorClass}`}>
        {sign}{change.toFixed(2)} ({sign}{changePercent.toFixed(2)}%)
      </div>
      
      {extra && (
        <div className="mt-2 pt-2 border-t border-terminal-border text-2xs text-text-muted">
          {extra}
        </div>
      )}
    </div>
  );
}

// 迷你行情行组件
interface MiniQuoteRowProps {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

export function MiniQuoteRow({ symbol, name, price, changePercent }: MiniQuoteRowProps) {
  const isUp = changePercent >= 0;
  const colorClass = isUp ? "text-data-up" : "text-data-down";
  const sign = isUp ? "+" : "";

  return (
    <div className="flex items-center justify-between py-2 border-b border-terminal-border/50 hover:bg-terminal-bg-tertiary px-2 -mx-2 transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-terminal-bg-tertiary rounded flex items-center justify-center text-xs font-bold text-text-secondary">
          {symbol.slice(0, 2)}
        </div>
        <div>
          <div className="text-sm font-medium text-text-primary">{symbol}</div>
          <div className="text-2xs text-text-muted">{name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono font-medium text-text-primary tabular-nums">
          {price.toFixed(2)}
        </div>
        <div className={`text-xs font-mono tabular-nums ${colorClass}`}>
          {sign}{changePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

// 信号徽章组件
interface SignalBadgeProps {
  signal: "bullish" | "bearish" | "neutral";
  strength?: "weak" | "moderate" | "strong";
  children: React.ReactNode;
}

export function SignalBadge({ signal, strength = "moderate", children }: SignalBadgeProps) {
  const signalConfig = {
    bullish: {
      bg: "bg-data-up/10",
      text: "text-data-up",
      border: "border-data-up/30",
    },
    bearish: {
      bg: "bg-data-down/10",
      text: "text-data-down",
      border: "border-data-down/30",
    },
    neutral: {
      bg: "bg-terminal-bg-tertiary",
      text: "text-text-secondary",
      border: "border-terminal-border",
    },
  };

  const strengthIcons = {
    weak: "●○○",
    moderate: "●●○",
    strong: "●●●",
  };

  const config = signalConfig[signal];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <span className="text-2xs opacity-70">{strengthIcons[strength]}</span>
      {children}
    </span>
  );
}

// 指标数值卡片
interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  delta?: string;
}

export function MetricCard({ label, value, unit, trend, delta }: MetricCardProps) {
  const trendColors = {
    up: "text-data-up",
    down: "text-data-down",
    neutral: "text-text-secondary",
  };

  return (
    <div className="bg-terminal-bg-tertiary rounded p-3">
      <div className="text-2xs text-text-muted uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-mono font-semibold text-text-primary tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-text-muted">{unit}</span>
        )}
      </div>
      {trend && delta && (
        <div className={`text-xs mt-1 ${trendColors[trend]}`}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {delta}
        </div>
      )}
    </div>
  );
}
