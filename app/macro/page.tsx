"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ShieldAlert, Target, History, Radar } from "lucide-react";
import { fetchMacroIndicatorsAbs, indexById, formatValue } from "@/lib/adapters/macroIndicators";
import { fetchCnMacroSnapshot, type CnMacroSnapshot } from "@/lib/api/macro-cn";

interface RegimeData {
  region: string;
  status: string;
  updatedAt: string;
  regime: {
    name: string;
    confidence: number;
    driver: string;
    counterSignals: string[];
  };
}

interface RegimeHistoryItem {
  period: string;
  tag: string;
  summary: string;
}

interface MonitorItem {
  name: string;
  region: string;
  why: string;
  watch: string;
}

export default function MacroPage() {
  const [usById, setUsById] = useState<Record<string, { value: number | null; asOf: string | null; source: string }> | null>(null);
  const [cn, setCn] = useState<CnMacroSnapshot | null>(null);
  const [cnFreshness, setCnFreshness] = useState<string | null>(null);
  const [regime, setRegime] = useState<RegimeData | null>(null);
  const [history, setHistory] = useState<RegimeHistoryItem[]>([]);
  const [monitorItems, setMonitorItems] = useState<MonitorItem[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const origin = window.location.origin;
        const us = await fetchMacroIndicatorsAbs(origin);
        if (us) setUsById(indexById(us.indicators) as Record<string, { value: number | null; asOf: string | null; source: string }>);
      } catch {}

      try {
        const cnRes = await fetchCnMacroSnapshot();
        if (cnRes?.data) {
          setCn(cnRes.data);
          setCnFreshness(cnRes.freshness || null);
        }
      } catch {}

      try {
        const res = await fetch("/api/macro-regime", { cache: "no-store" });
        const json = await res.json();
        if (json?.success && json?.data) setRegime(json.data);
      } catch {}

      try {
        const res = await fetch("/api/macro-history", { cache: "no-store" });
        const json = await res.json();
        if (json?.success && json?.data?.history) setHistory(json.data.history);
      } catch {}

      try {
        const res = await fetch("/api/macro-monitor", { cache: "no-store" });
        const json = await res.json();
        if (json?.success && json?.data?.items) setMonitorItems(json.data.items);
      } catch {}
    };

    run();
  }, []);

  const dimensions = [
    {
      title: "增长 Growth",
      status: cn?.series?.unemployment_urban ? formatValue(cn.series.unemployment_urban.value, "%") : "中性偏弱",
      note: cn?.series?.unemployment_urban
        ? `CN 失业率 asOf ${cn.series.unemployment_urban.asOf || "-"}${cnFreshness === "STALE" ? " · STALE" : ""}`
        : "当前作为研究占位模块，待接中美真实宏观状态引擎。",
    },
    {
      title: "通胀 Inflation",
      status: cn?.series?.cpi_yoy ? formatValue(cn.series.cpi_yoy.value, "%") : (usById?.us_cpi ? formatValue(usById.us_cpi.value, "idx") : "回落观察"),
      note: cn?.series?.cpi_yoy
        ? `CN CPI asOf ${cn.series.cpi_yoy.asOf || "-"}${cnFreshness === "STALE" ? " · STALE" : ""}`
        : "后续接 CPI / PPI / 通胀预期与资产映射。",
    },
    {
      title: "政策 Policy",
      status: cn?.series?.lpr_1y ? formatValue(cn.series.lpr_1y.value, "%") : (usById?.us_fedfunds ? formatValue(usById.us_fedfunds.value, "%") : "等待细化"),
      note: cn?.series?.lpr_1y
        ? `CN LPR asOf ${cn.series.lpr_1y.asOf || "-"}${cnFreshness === "STALE" ? " · STALE" : ""}`
        : "后续接美联储 / 中国政策利率与政策偏向。",
    },
    {
      title: "流动性 Liquidity",
      status: cn?.series?.m2_yoy ? formatValue(cn.series.m2_yoy.value, "%") : (usById?.us_10y ? formatValue(usById.us_10y.value, "%") : "等待细化"),
      note: cn?.series?.m2_yoy
        ? `CN M2 asOf ${cn.series.m2_yoy.asOf || "-"}${cnFreshness === "STALE" ? " · STALE" : ""}`
        : "后续接信用脉冲、M2、收益率曲线与美元流动性。",
    },
  ];

  const regions = [
    {
      title: "🇺🇸 美国主轴",
      bullets: [
        `ISM: ${usById?.us_ism_pmi ? formatValue(usById.us_ism_pmi.value, "idx") : "—"}`,
        `Fed: ${usById?.us_fedfunds ? formatValue(usById.us_fedfunds.value, "%") : "—"}`,
        `10Y: ${usById?.us_10y ? formatValue(usById.us_10y.value, "%") : "—"}`,
      ],
    },
    {
      title: "🇨🇳 中国主轴",
      bullets: [
        `PMI: ${cn?.series?.pmi_mfg ? formatValue(cn.series.pmi_mfg.value, "idx") : "—"}`,
        `LPR: ${cn?.series?.lpr_1y ? formatValue(cn.series.lpr_1y.value, "%") : "—"}`,
        `社融: ${cn?.series?.social_financing?.value != null ? cn.series.social_financing.value.toFixed(4) + " 万亿" : "—"}`,
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="space-y-2">
        <div className="text-sm text-amber-400 font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Macro Research Hub
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-50">宏观研究中枢 / Macro Hub</h1>
        <p className="text-sm text-slate-400">🌍 已接入首页宏观数据骨架，后续继续增强 regime 判断与中美双主轴研究层。</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><Target className="w-5 h-5 text-amber-500" /> 当前 Regime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{regime?.regime?.name || "Neutral"}</Badge>
            <span>📊 置信度：{regime?.regime?.confidence ?? 50}%</span>
          </div>
          <div>🧭 核心驱动：{regime?.regime?.driver || "数据源恢复中，暂按中性基线显示"}</div>
          <div className="space-y-1">
            <div className="text-slate-400">⚠️ 反证条件：</div>
            {(regime?.regime?.counterSignals || ["等待更多数据验证", "中美主轴仍在恢复", "流动性链条仍需观察"]).map((item) => (
              <div key={item} className="text-xs text-slate-400">• {item}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" /> 当前定位</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div>🎯 这里是宏观研究中枢，不是资讯页。</div>
          <div>📌 当前版本已打通首页现有宏观展示层数据；下一阶段继续补 regime 引擎、历史映射与反证条件。</div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {dimensions.map((item) => (
          <Card key={item.title} className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-100">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{item.status}</Badge>
              <div className="text-xs text-slate-400">{item.note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {regions.map((region) => (
          <Card key={region.title} className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">{region.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-300">
                {region.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><History className="w-5 h-5 text-cyan-400" /> 历史映射 / Historical Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          {history.length > 0 ? history.map((item) => (
            <div key={item.period} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{item.tag}</Badge>
                <span className="text-sm font-medium text-slate-100">{item.period}</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">{item.summary}</div>
            </div>
          )) : (
            <div className="text-xs text-slate-500">暂无历史映射数据</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><Radar className="w-5 h-5 text-emerald-400" /> 监控变量 / Monitor Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          {monitorItems.length > 0 ? monitorItems.map((item) => (
            <div key={item.name} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{item.region}</Badge>
                <span className="text-sm font-medium text-slate-100">{item.name}</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">📌 {item.why}</div>
              <div className="text-xs text-amber-300 mt-1">⚠️ {item.watch}</div>
            </div>
          )) : (
            <div className="text-xs text-slate-500">暂无监控变量</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}