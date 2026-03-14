"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Droplets, Activity, Gauge, DollarSign, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchMacroIndicatorsAbs, indexById, formatValue } from "@/lib/adapters/macroIndicators";
import { fetchCnMacroSnapshot, type CnMacroSnapshot } from "@/lib/api/macro-cn";

// NOTE: Homepage macro cards must use stable indicator ids from /api/macro-indicators.
// Old ids like us_cpi/us_fedfunds/us_unrate were removed when we standardized the schema.

interface IndicatorProps {
  title: string;
  value: string | number;
  unit?: string;
  trend: "up" | "down" | "neutral";
  level: "high" | "medium" | "low";
  description: string;
  icon: LucideIcon;
}

function fmt(val: number | null | undefined, unit?: string) {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  if (unit === "%") return `${val.toFixed(2)}%`;
  if (unit === "idx") return val.toFixed(2);
  return String(val);
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
                {unit ? <span className="text-xs text-slate-500">{unit}</span> : null}
              </div>
            </div>
          </div>
          <TrendIcon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="mt-2 text-[10px] md:text-xs text-slate-500">{description}</div>
      </CardContent>
    </Card>
  );
}

export function MacroDashboard() {
  const [us, setUs] = useState<{ updatedAt: string; byId: Record<string, unknown> } | null>(null);
  const [usStatus, setUsStatus] = useState<"LOADING" | "LIVE" | "OFF" | "ERROR">("LOADING");

  const [cn, setCn] = useState<CnMacroSnapshot | null>(null);
  const [cnFreshness, setCnFreshness] = useState<"LIVE" | "STALE" | null>(null);
  const [cnStatus, setCnStatus] = useState<"LOADING" | "LIVE" | "OFF" | "ERROR">("LOADING");

  // Supabase-backed CN indicators via /api/macro-indicators (preferred)
  const [cnById, setCnById] = useState<Record<string, { value: number | null; asOf: string | null; source: string }> | null>(null);

  useEffect(() => {
    const fetchUs = async () => {
      try {
        setUsStatus("LOADING");
        const origin = window.location.origin;
        const res = await fetchMacroIndicatorsAbs(origin);
        if (!res) {
          setUs(null);
          setUsStatus("OFF");
          return;
        }
        setUs({ updatedAt: res.updatedAt, byId: indexById(res.indicators) });
        setUsStatus("LIVE");
      } catch {
        setUs(null);
        setUsStatus("ERROR");
      }
    };

    const fetchCn = async () => {
      try {
        setCnStatus("LOADING");
        const origin = window.location.origin;
        const res = await fetchMacroIndicatorsAbs(origin);
        if (res) {
          const by = indexById(res.indicators) as Record<string, { value: number | null; asOf: string | null; source: string }>;
          setCnById(by);
          setCnFreshness(null);
          setCnStatus("LIVE");
          // also keep legacy snapshot for fields not yet in macro-indicators
          const snap = await fetchCnMacroSnapshot();
          if (snap?.data) setCn(snap.data);
          return;
        }

        // fallback to legacy /api/macro-cn
        const snap = await fetchCnMacroSnapshot();
        if (!snap || !snap.data) {
          setCn(null);
          setCnById(null);
          setCnFreshness(null);
          setCnStatus("OFF");
          return;
        }
        setCn(snap.data);
        setCnById(null);
        setCnFreshness(snap.freshness || null);
        setCnStatus(snap.data.status === "LIVE" ? "LIVE" : "OFF");
      } catch {
        setCn(null);
        setCnById(null);
        setCnStatus("ERROR");
      }
    };

    fetchUs();
    fetchCn();

    // monthly-ish: refresh daily
    const usInt = setInterval(fetchUs, 24 * 60 * 60_000);
    const cnInt = setInterval(fetchCn, 24 * 60 * 60_000);
    return () => {
      clearInterval(usInt);
      clearInterval(cnInt);
    };
  }, []);

  const usById = (us?.byId as Record<string, { value: number | null; asOf: string | null; source: string }>) || null;

  const cnIndicators: IndicatorProps[] = [
    {
      title: "制造业PMI",
      value: cnById ? formatValue(cnById["cn_pmi_mfg"]?.value ?? null, "idx") : fmt(cn?.series.pmi_mfg?.value, "idx"),
      unit: "",
      trend: "neutral",
      level: cnStatus === "LIVE" ? "low" : "medium",
      description:
        cnStatus === "LIVE"
          ? `asOf ${(cnById?.["cn_pmi_mfg"]?.asOf || cn?.series.pmi_mfg?.asOf || "-")} · ${(cnById?.["cn_pmi_mfg"]?.source || cn?.series.pmi_mfg?.source || "-")}${cnFreshness === "STALE" ? " · STALE" : ""}`
          : "数据源未连接或处理中",
      icon: TrendingUp,
    },
    {
      title: "CPI同比",
      value: cnById ? formatValue(cnById["cn_cpi_yoy"]?.value ?? null, "%") : fmt(cn?.series.cpi_yoy?.value, "%"),
      unit: "%",
      trend: "neutral",
      level: cnStatus === "LIVE" ? "low" : "medium",
      description:
        cnStatus === "LIVE"
          ? `asOf ${(cnById?.["cn_cpi_yoy"]?.asOf || cn?.series.cpi_yoy?.asOf || "-")} · ${(cnById?.["cn_cpi_yoy"]?.source || cn?.series.cpi_yoy?.source || "-")}${cnFreshness === "STALE" ? " · STALE" : ""}`
          : "数据源未连接或处理中",
      icon: Activity,
    },
    {
      title: "社融增量(当月)",
      // /api/macro-cn exposes social_financing.value in 亿元; display in 万亿 for readability
      value: (() => {
        const v = cn?.series?.social_financing?.value;
        if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
        const t = Number(v) / 10000; // 亿元 -> 万亿
        return t.toFixed(2);
      })(),
      unit: "万亿",
      trend: "neutral",
      level: cnStatus === "LIVE" ? "medium" : "medium",
      description:
        cnStatus === "LIVE"
          ? `asOf ${cn?.series.social_financing?.asOf || "-"} · ${cn?.series.social_financing?.source || "-"}`
          : "数据源未连接或处理中",
      icon: Droplets,
    },
    {
      title: "LPR利率(1Y)",
      value: cnById ? formatValue(cnById["cn_lpr_1y"]?.value ?? null, "%") : fmt(cn?.series.lpr_1y?.value, "%"),
      unit: "%",
      trend: "neutral",
      level: cnStatus === "LIVE" ? "low" : "medium",
      description:
        cnStatus === "LIVE"
          ? `asOf ${(cnById?.["cn_lpr_1y"]?.asOf || cn?.series.lpr_1y?.asOf || "-")} · ${(cnById?.["cn_lpr_1y"]?.source || cn?.series.lpr_1y?.source || "-")}${cnFreshness === "STALE" ? " · STALE" : ""}`
          : "数据源未连接或处理中",
      icon: DollarSign,
    },
  ];

  const usIndicators: IndicatorProps[] = [
    {
      title: "ISM服务业",
      value: usById ? formatValue(usById["us_ism_services_pmi"]?.value ?? null, "idx") : "—",
      unit: "",
      trend: "neutral",
      level: usStatus === "LIVE" ? "low" : "medium",
      description:
        usStatus === "LIVE"
          ? `asOf ${usById?.["us_ism_services_pmi"]?.asOf || "-"} · ${usById?.["us_ism_services_pmi"]?.source || "-"}`
          : "数据源未连接或处理中",
      icon: TrendingUp,
    },
    {
      title: "CPI同比",
      value: usById ? formatValue(usById["us_cpi_yoy"]?.value ?? null, "%") : "—",
      unit: "%",
      trend: "neutral",
      level: usStatus === "LIVE" ? "low" : "medium",
      description:
        usStatus === "LIVE"
          ? `asOf ${usById?.["us_cpi_yoy"]?.asOf || "-"} · ${usById?.["us_cpi_yoy"]?.source || "-"}`
          : "数据源未连接或处理中",
      icon: Activity,
    },
    {
      title: "联邦利率",
      value: usById ? formatValue(usById["us_policy_rate"]?.value ?? null, "%") : "—",
      unit: "%",
      trend: "neutral",
      level: usStatus === "LIVE" ? "low" : "medium",
      description:
        usStatus === "LIVE"
          ? `asOf ${usById?.["us_policy_rate"]?.asOf || "-"} · ${usById?.["us_policy_rate"]?.source || "-"}`
          : "数据源未连接或处理中",
      icon: DollarSign,
    },
    {
      title: "失业率",
      value: usById ? formatValue(usById["us_unemployment"]?.value ?? null, "%") : "—",
      unit: "%",
      trend: "neutral",
      level: usStatus === "LIVE" ? "low" : "medium",
      description:
        usStatus === "LIVE"
          ? `asOf ${usById?.["us_unemployment"]?.asOf || "-"} · ${usById?.["us_unemployment"]?.source || "-"}`
          : "数据源未连接或处理中",
      icon: Gauge,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🇨🇳</span>
          <span className="text-sm font-medium text-slate-300">中国宏观指标</span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {cnIndicators.map((ind) => (
            <IndicatorCard key={`cn-${ind.title}`} {...ind} />
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800" />

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
