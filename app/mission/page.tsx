"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bot, Flag, RefreshCw, Target, Workflow, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

type TaskStatus = "TODO" | "DOING" | "DONE" | "BLOCKED";

type LiveAgentStatus = {
  agent: string;
  status: string;
  step: string | null;
  progress: number | null;
  output: string | null;
  updated_at: string;
};

interface MissionTask {
  id: string;
  title: string;
  owner: string;
  module: string;
  priority: string;
  status: TaskStatus;
  note: string;
  dependsOn?: string[];
  startedAt?: string;
  completedAt?: string;
  estimatedHours?: number;
  source?: "Macro" | "Portfolio Drift" | "Monitor Trigger" | "Manual" | "System";
}

interface MissionPayload {
  summary: {
    objective: string;
    phase: string;
    done: number;
    doing: number;
    blocked: number;
    updatedAt: string;
  };
  tasks: MissionTask[];
  timeline: string[];
  blockers: string[];
}

function agentVisual(status: string) {
  const s = status.toLowerCase();
  if (s === "running") return { dot: "bg-green-400 animate-pulse", badge: "bg-green-500/15 text-green-400 border-green-500/30", label: "RUNNING" };
  if (s === "done") return { dot: "bg-blue-400", badge: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "DONE" };
  if (s === "error" || s === "blocked") return { dot: "bg-red-400", badge: "bg-red-500/15 text-red-400 border-red-500/30", label: "ERROR" };
  return { dot: "bg-slate-400", badge: "bg-slate-500/15 text-slate-300 border-slate-500/30", label: "IDLE" };
}

function useTypewriter(text: string) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    let active = true;
    setDisplay("");
    let i = 0;
    const tick = () => {
      if (!active) return;
      i += 1;
      setDisplay(text.slice(0, i));
      if (i < text.length) setTimeout(tick, 10);
    };
    tick();
    return () => {
      active = false;
    };
  }, [text]);
  return display;
}

function LiveAgentCard({ agent }: { agent: LiveAgentStatus }) {
  const visual = agentVisual(agent.status || "idle");
  const typedOutput = useTypewriter(agent.output || "");
  const progress = typeof agent.progress === "number" ? Math.max(0, Math.min(100, agent.progress)) : 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${visual.dot}`} />
          <div className="text-sm font-medium text-slate-100">🤖 {agent.agent}</div>
        </div>
        <Badge className={visual.badge}>{visual.label}</Badge>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">当前步骤</div>
        <div className="text-sm text-slate-200">{agent.step || "—"}</div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>进度</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">输出</div>
        <div className="min-h-[64px] rounded-lg bg-slate-900/80 px-3 py-2 text-xs text-slate-300 whitespace-pre-wrap font-mono">{typedOutput || "—"}</div>
      </div>

      <div className="text-[11px] text-slate-500">updated_at: {new Date(agent.updated_at).toLocaleString("zh-CN")}</div>
    </div>
  );
}

export default function MissionPage() {
  const [data, setData] = useState<MissionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveAgents, setLiveAgents] = useState<LiveAgentStatus[]>([]);
  const fetchedRef = useRef(false);

  const fetchMission = async () => {
    try {
      const res = await fetch("/api/mission", { cache: "no-store" });
      const json = await res.json();
      if (json?.success && json?.data) setData(json.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentStatus = async () => {
    const { data, error } = await supabase
      .from("agent_status")
      .select("agent,status,step,progress,output,updated_at")
      .order("updated_at", { ascending: false });
    if (!error && data) setLiveAgents(data as LiveAgentStatus[]);
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchMission();
    fetchAgentStatus();

    const timer = setInterval(() => {
      fetchMission();
      fetchAgentStatus();
    }, 30000);

    const channel = supabase
      .channel("agent-status-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_status" }, () => {
        fetchAgentStatus();
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const liveSummary = useMemo(() => {
    const counts = { running: 0, done: 0, idle: 0, error: 0 };
    liveAgents.forEach((a) => {
      const s = (a.status || "").toLowerCase();
      if (s === "running") counts.running += 1;
      else if (s === "done") counts.done += 1;
      else if (s === "error" || s === "blocked") counts.error += 1;
      else counts.idle += 1;
    });
    return counts;
  }, [liveAgents]);

  if (loading || !data) {
    return (
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium"><Target className="w-4 h-4" /> Mission Control</div>
        <Card className="bg-slate-900/50 border-slate-800"><CardContent className="p-6 text-slate-400 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> 正在加载执行状态...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /><span className="text-amber-400 font-bold text-lg">MISSION CONTROL</span></div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-700"><Flag className="w-4 h-4 text-blue-400" /><span className="text-xs text-slate-400">PHASE</span><span className="text-sm font-medium text-slate-100">{data.summary.phase.split("·")[0]}</span></div>
            <span className="text-slate-500">→</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-700"><Target className="w-4 h-4 text-purple-400" /><span className="text-xs text-slate-400">CHECKPOINT</span><span className="text-sm font-medium text-purple-300">{data.summary.phase.split("：")[1] || "N/A"}</span></div>
            <span className="text-slate-500">→</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-700"><Workflow className="w-4 h-4 text-emerald-400" /><span className="text-xs text-slate-400">PROGRESS</span><div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${Math.round((data.summary.done / Math.max(1, data.tasks.length)) * 100)}%` }} /></div><span className="text-sm font-medium text-emerald-300">{Math.round((data.summary.done / Math.max(1, data.tasks.length)) * 100)}%</span></div>
          </div>
          <button onClick={() => { fetchMission(); fetchAgentStatus(); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg bg-slate-950/50 px-3 py-2 text-slate-300">运行中 <span className="text-green-400 font-bold">{liveSummary.running}</span></div>
          <div className="rounded-lg bg-slate-950/50 px-3 py-2 text-slate-300">已完成 <span className="text-blue-400 font-bold">{liveSummary.done}</span></div>
          <div className="rounded-lg bg-slate-950/50 px-3 py-2 text-slate-300">待机 <span className="text-slate-300 font-bold">{liveSummary.idle}</span></div>
          <div className="rounded-lg bg-slate-950/50 px-3 py-2 text-slate-300">异常 <span className="text-red-400 font-bold">{liveSummary.error}</span></div>
        </div>
      </div>

      {liveAgents.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader><CardTitle className="text-slate-100 flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-400" /> Agent Status Live</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{liveAgents.map((agent) => <LiveAgentCard key={agent.agent} agent={agent} />)}</CardContent>
        </Card>
      )}

      {data.blockers.length > 0 && (
        <Card className="bg-red-950/20 border-red-800/50">
          <CardHeader className="pb-2"><CardTitle className="text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> 🚨 当前阻塞 / BLOCKERS</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">{data.blockers.map((item, idx) => <div key={idx} className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 flex items-start gap-3"><span className="text-red-400 text-lg">🔴</span><div><div className="text-sm text-red-200 font-medium">{item}</div><div className="text-xs text-red-400/70 mt-1">需要解决后才能继续执行</div></div></div>)}</div></CardContent>
        </Card>
      )}
    </div>
  );
}