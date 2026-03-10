"use client";

import { Card, CardContent } from "@/components/ui/card";

import { TrendingUp, TrendingDown, Minus, Droplets, Activity, Gauge, DollarSign, type LucideIcon } from "lucide-react";

interface IndicatorProps {
  title: string;
  value: string | number;
  unit?: string;
  trend: "up" | "down" | "neutral";
  level: "high" | "medium" | "low";
  description: string;
  icon: LucideIcon;
}

const levelConfig = {
  high: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  low: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

function IndicatorCard({ title, value, unit, trend, level, description, icon: Icon }: IndicatorProps) {
  const config = levelConfig[level];
  const TrendIcon = trendIcons[trend];
  
  return (
    <Card className={`${config.bg} ${config.border} border`}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div>
              <div className="text-xs text-slate-400">{title}</div>
              <div className="flex items-baseline gap-1">
                <span className={`text-lg font-bold ${config.color}`}>{value}</span>
                {unit && <span className="text-xs text-slate-500">{unit}</span>}
              </div>
            </div>
          </div>
          <TrendIcon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="mt-2 text-[10px] md:text-xs text-slate-500">
          {description}
        </div>
      </CardContent>
    </Card>
  );
}

// 中国宏观指标
const chinaIndicators: IndicatorProps[] = [
  {
    title: "制造业PMI",
    value: "50.8",
    unit: "",
    trend: "up",
    level: "medium",
    description: "重回扩张区间，制造业复苏迹象明显",
    icon: TrendingUp,
  },
  {
    title: "CPI同比",
    value: "0.7",
    unit: "%",
    trend: "up",
    level: "low",
    description: "通胀温和回升，通缩压力缓解",
    icon: Activity,
  },
  {
    title: "社融规模",
    value: "4.56",
    unit: "万亿",
    trend: "up",
    level: "medium",
    description: "信贷投放稳健，流动性合理充裕",
    icon: Droplets,
  },
  {
    title: "LPR利率",
    value: "3.45",
    unit: "%",
    trend: "down",
    level: "low",
    description: "维持低位，支持实体经济",
    icon: DollarSign,
  },
];

// 美国宏观指标
const usIndicators: IndicatorProps[] = [
  {
    title: "ISM制造业",
    value: "50.3",
    unit: "",
    trend: "up",
    level: "medium",
    description: "突破荣枯线，制造业景气改善",
    icon: TrendingUp,
  },
  {
    title: "CPI同比",
    value: "3.2",
    unit: "%",
    trend: "neutral",
    level: "medium",
    description: "略高于目标，粘性仍存",
    icon: Activity,
  },
  {
    title: "联邦利率",
    value: "5.50",
    unit: "%",
    trend: "neutral",
    level: "high",
    description: "维持高位，关注降息时点",
    icon: DollarSign,
  },
  {
    title: "失业率",
    value: "4.0",
    unit: "%",
    trend: "neutral",
    level: "medium",
    description: "处于历史低位，就业市场稳健",
    icon: Gauge,
  },
];

export function MacroDashboard() {
  return (
    <div className="space-y-4">
      {/* 中国宏观指标 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🇨🇳</span>
          <span className="text-sm font-medium text-slate-300">中国宏观指标</span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {chinaIndicators.map((ind) => (
            <IndicatorCard key={`cn-${ind.title}`} {...ind} />
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-slate-800"></div>

      {/* 美国宏观指标 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🇺🇸</span>
          <span className="text-sm font-medium text-slate-300">美国宏观指标</span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {usIndicators.map((ind) => (
            <IndicatorCard key={`us-${ind.title}`} {...ind} />
          ))}
        </div>
      </div>
    </div>
  );
}