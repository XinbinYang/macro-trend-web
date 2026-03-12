"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bot, Clock3, Flag, Layers3, RefreshCw, Target } from "lucide-react";

type TaskStatus = "TODO" | "DOING" | "DONE" | "BLOCKED";

interface MissionTask {
  id: string;
  title: string;
  owner: string;
  module: string;
  priority: string;
  status: TaskStatus;
  note: string;
}

interface AgentStatus {
  name: string;
  role: string;
  status: string;
  task: string;
  risk: string;
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
  agents: AgentStatus[];
  timeline: string[];
  blockers: string[];
  devFeed?: {
    commits?: Array<{ sha: string; message: string }>;
  };
}

function statusBadge(status: string) {
  if (status === "DONE") return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">🟢 DONE</Badge>;
  if (status === "DOING") return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">🟡 DOING</Badge>;
  if (status === "BLOCKED") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">🔴 BLOCKED</Badge>;
  return <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30">⚪ TODO</Badge>;
}

export default function MissionPage() {
  const [data, setData] = useState<MissionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const fetchMission = async () => {
    try {
      const res = await fetch("/api/mission", { cache: "no-store" });
      const json = await res.json();
      if (json?.success && json?.data) {
        setData(json.data);
        setLastFetchedAt(new Date());
      }
    } catch (error) {
      console.error("[mission] fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMission();
    const timer = setInterval(fetchMission, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
          <Target className="w-4 h-4" /> Mission Control
        </div>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6 text-slate-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> 正在加载执行状态...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
          <Target className="w-4 h-4" /> Mission Control
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-50">执行中枢 / 任务作战看板</h1>
            <p className="text-sm text-slate-400">🧭 当前用于跟踪网页端建设、子代理协同、阻塞项与阶段目标。</p>
            <p className="text-xs text-slate-500 mt-1">⏱️ last refresh: {lastFetchedAt ? `${Math.max(0, Math.floor((Date.now() - lastFetchedAt.getTime()) / 1000))}s ago` : "-"}</p>
          </div>
          <button
            onClick={fetchMission}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><Flag className="w-5 h-5 text-amber-500" /> 总任务概览</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <div><span className="text-slate-500">🎯 当前总目标：</span> {data.summary.objective}</div>
          <div><span className="text-slate-500">📍 当前阶段：</span> {data.summary.phase}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">🟢 已完成</div><div className="text-xl font-bold">{data.summary.done}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">🟡 进行中</div><div className="text-xl font-bold">{data.summary.doing}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">🔴 阻塞</div><div className="text-xl font-bold">{data.summary.blocked}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">⏱️ 更新时间</div><div className="text-sm font-medium">{new Date(data.summary.updatedAt).toLocaleString("zh-CN")}</div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2"><Layers3 className="w-5 h-5 text-blue-400" /> 当前任务列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">{task.id} · {task.module} · {task.priority}</div>
                    <div className="text-sm font-medium text-slate-100">{task.title}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">👤 {task.owner}</Badge>
                    {statusBadge(task.status)}
                    {task.status === "DOING" ? <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> : null}
                    {task.status === "BLOCKED" ? <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> : null}
                  </div>
                </div>
                <div className="text-xs text-slate-400">{task.note}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-400" /> 子代理状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.agents.map((agent) => (
                <div key={agent.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <div className="text-sm font-medium text-slate-100">🤖 {agent.name}</div>
                  <div className="text-xs text-slate-400">{agent.role}</div>
                  <div className="text-xs text-slate-300">当前任务：{agent.task}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={agent.status === "RUNNING" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-slate-500/15 text-slate-300 border-slate-500/30"}>
                      {agent.status === "RUNNING" ? "🟡 RUNNING" : "⚪ IDLE"}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">风险：{agent.risk}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><Clock3 className="w-5 h-5 text-purple-400" /> 最近进展时间线</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              {data.timeline.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">{item}</div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-red-900/50">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> 当前阻塞</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300 space-y-2">
              {data.blockers.map((item, idx) => (
                <div key={idx}>🔴 {item}</div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><Clock3 className="w-5 h-5 text-cyan-400" /> 开发动态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              {(data.devFeed?.commits || []).length > 0 ? (
                (data.devFeed?.commits || []).map((commit) => (
                  <div key={commit.sha} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <div className="text-[11px] text-slate-500">{commit.sha}</div>
                    <div className="text-xs text-slate-300">{commit.message}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">暂无开发动态</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}