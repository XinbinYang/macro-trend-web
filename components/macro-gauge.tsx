"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Droplets, Activity, Gauge, type LucideIcon } from "lucide-react";

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

export function MacroDashboard() {
  const indicators: IndicatorProps[] = [
    {
      title: "经济周期",
      value: "扩张期",
      trend: "up",
      level: "medium",
      description: "全球制造业PMI回升，处于扩张周期",
      icon: TrendingUp,
    },
    {
      title: "通胀预期",
      value: "3.2",
      unit: "%",
      trend: "neutral",
      level: "medium",
      description: "略高于目标水平，粘性较强",
      icon: Activity,
    },
    {
      title: "流动性",
      value: "宽松",
      trend: "up",
      level: "high",
      description: "主要央行维持低利率政策",
      icon: Droplets,
    },
    {
      title: "风险偏好",
      value: "中性",
      trend: "neutral",
      level: "medium",
      description: "VIX指数处于历史均值附近",
      icon: Gauge,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:gap-4">
      {indicators.map((ind) => (
        <IndicatorCard key={ind.title} {...ind} />
      ))}
    </div>
  );
}
