"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

type NavPoint = { date: string; value: number };

type NavPayload = {
  strategy: string;
  name: string;
  status: "LIVE" | "SAMPLE";
  asOf: string;
  currency: string;
  base: number;
  nav: NavPoint[];
  metrics?: {
    cagr: number | null;
    vol: number | null;
    maxDrawdown: number | null;
    sharpe: number | null;
  };
  dataLineage?: {
    sources?: string[];
    model?: { navFrequency?: string };
  };
  disclaimer?: string;
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-slate-100">{value}</div>
    </div>
  );
}

export default function StrategiesPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<NavPayload | null>(null);

  const fetchNav = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/nav?strategy=beta70");
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Failed");
      setPayload(j.data);
    } catch (e) {
      setPayload(null);
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = payload?.name || "中美全天候Beta";
  const status = payload?.status;

  const cagr = payload?.metrics?.cagr;
  const vol = payload?.metrics?.vol;
  const mdd = payload?.metrics?.maxDrawdown;
  const sharpe = payload?.metrics?.sharpe;

  const source = payload?.dataLineage?.sources?.[0] || "—";
  const navFreq = payload?.dataLineage?.model?.navFrequency || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50">策略</h1>
          <p className="text-sm text-slate-400">当前仅展示单策略（路先跑通），其它策略未开发前保持 OFF/—</p>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <Badge
              variant="outline"
              className={
                status === "LIVE"
                  ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                  : "text-amber-300 border-amber-500/30 bg-amber-500/10"
              }
            >
              {status}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={fetchNav}
            className="border-slate-700 text-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-100 flex items-center justify-between">
            <span>{name}</span>
            <span className="text-[11px] text-slate-400 font-mono">asOf: {payload?.asOf || "—"}</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            source: {source} · NAV: {navFreq} · Sharpe 假设 rf=0
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full bg-slate-800" />
          ) : err ? (
            <div className="text-sm text-red-400">{err}</div>
          ) : payload?.nav?.length ? (
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="99%" height="100%" minHeight={300}>
                <LineChart data={payload.nav}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(0, 7)} className="text-xs" />
                  <YAxis className="text-xs" domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                    formatter={(v: unknown) => [Number(v).toFixed(2), "NAV"]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-slate-400">暂无净值数据</div>
          )}

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <MetricCard label="年化收益率 (CAGR)" value={cagr == null ? "—" : `${(cagr * 100).toFixed(2)}%`} />
            <MetricCard label="年化波动率 (Vol)" value={vol == null ? "—" : `${(vol * 100).toFixed(2)}%`} />
            <MetricCard label="最大回撤 (Max DD)" value={mdd == null ? "—" : `${(mdd * 100).toFixed(2)}%`} />
            <MetricCard label="夏普 (rf=0)" value={sharpe == null ? "—" : sharpe.toFixed(2)} />
          </div>

          <div className="mt-3 text-[11px] text-slate-500">{payload?.disclaimer || ""}</div>
        </CardContent>
      </Card>
    </div>
  );
}
