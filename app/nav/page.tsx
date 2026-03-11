"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
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
    truthLayer?: string;
    sources?: string[];
    pricing?: string;
    notes?: string;
  };
  disclaimer?: string;
};

export default function NavPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<NavPayload | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/nav?strategy=beta70");
        const j = await res.json();
        if (!j.success) throw new Error(j.error || "Failed");
        if (!alive) return;
        setPayload(j.data);
      } catch (e) {
        if (!alive) return;
        setErr((e as Error).message);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50">策略净值</h1>
          <p className="text-sm text-slate-400">真值层产物只读展示（回测/信号）</p>
        </div>
        {payload?.status && (
          <Badge
            variant="outline"
            className={
              payload.status === "LIVE"
                ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                : "text-amber-300 border-amber-500/30 bg-amber-500/10"
            }
          >
            {payload.status}
          </Badge>
        )}
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-100 flex items-center justify-between">
            <span>{payload?.name || "All-Weather Beta 7.0"}</span>
            <span className="text-[11px] text-slate-400 font-mono">asOf: {payload?.asOf || "—"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {loading ? (
            <Skeleton className="h-[240px] w-full bg-slate-800" />
          ) : err ? (
            <div className="text-sm text-red-400">{err}</div>
          ) : payload?.nav?.length ? (
            <div className="w-full min-h-[240px]">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={payload.nav} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(5)} className="text-xs" />
                  <YAxis className="text-xs" domain={['auto','auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    formatter={(v: unknown) => [Number(v).toFixed(2), "NAV"]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-slate-400">暂无净值数据</div>
          )}

          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-3">
                <div className="text-[11px] text-slate-400">CAGR</div>
                <div className="text-lg font-bold text-slate-50">{payload?.metrics?.cagr == null ? "—" : `${(payload.metrics.cagr * 100).toFixed(2)}%`}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-3">
                <div className="text-[11px] text-slate-400">Vol</div>
                <div className="text-lg font-bold text-slate-50">{payload?.metrics?.vol == null ? "—" : `${(payload.metrics.vol * 100).toFixed(2)}%`}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-3">
                <div className="text-[11px] text-slate-400">Max DD</div>
                <div className="text-lg font-bold text-slate-50">{payload?.metrics?.maxDrawdown == null ? "—" : `${(payload.metrics.maxDrawdown * 100).toFixed(2)}%`}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-3">
                <div className="text-[11px] text-slate-400">Sharpe</div>
                <div className="text-lg font-bold text-slate-50">{payload?.metrics?.sharpe == null ? "—" : payload.metrics.sharpe.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            {payload?.disclaimer || ""}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
