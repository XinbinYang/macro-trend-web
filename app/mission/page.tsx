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
  dependsOn?: string[];
  startedAt?: string;
  completedAt?: string;
  estimatedHours?: number;
}

interface AgentStatus {
  name: string;
  role: string;
  status: string;
  task: string;
  risk: string;
  sessionId?: string;
  currentTaskId?: string;
  lastHeartbeatAt?: string;
  currentAction?: string;
  startedAt?: string;
  completedAt?: string;
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
          <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>任务进度</span>
              <span>{data.summary.done} / {data.tasks.length}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${(data.summary.done / data.tasks.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">🟢 已完成</div><div className="text-xl font-bold">{data.summary.done}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">🟡 进行中</div><div className="text-xl font-bold">{data.summary.doing}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">🔴 阻塞</div><div className="text-xl font-bold">{data.summary.blocked}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">⏱️ 更新时间</div><div className="text-sm font-medium">{new Date(data.summary.updatedAt).toLocaleString("zh-CN")}</div></div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="text-xs text-slate-500">📍 当前阶段</div>
            <div className="text-sm font-medium text-slate-100">{data.summary.phase}</div>
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
                <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                  {task.dependsOn?.length ? <span>🔗 depends: {task.dependsOn.join(", ")}</span> : null}
                  {task.startedAt ? <span>🚀 started: {new Date(task.startedAt).toLocaleString("zh-CN")}</span> : null}
                  {task.completedAt ? <span>✅ done: {new Date(task.completedAt).toLocaleString("zh-CN")}</span> : null}
                  {task.estimatedHours ? <span>⏱️ est: {task.estimatedHours}h</span> : null}
                  {/* Show duration for completed tasks */}
                  {task.status === "DONE" && task.startedAt && task.completedAt ? (
                    <span>⏳ dur: {Math.round((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 60000)}min</span>
                  ) : null}
                  {/* Show elapsed time for DOING tasks */}
                  {task.status === "DOING" && task.startedAt ? (
                    <span className="text-amber-400">⏳ elapsed: {Math.round((Date.now() - new Date(task.startedAt).getTime()) / 60000)}min</span>
                  ) : null}
                </div>
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
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-100">🤖 {agent.name}</div>
                    <Badge className={agent.status === "RUNNING" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : agent.status === "DONE" ? "bg-green-500/15 text-green-400 border-green-500/30" : agent.status === "BLOCKED" ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-slate-500/15 text-slate-300 border-slate-500/30"}>
                      {agent.status === "RUNNING" ? "🟡 RUNNING" : agent.status === "DONE" ? "🟢 DONE" : agent.status === "BLOCKED" ? "🔴 BLOCKED" : "⚪ IDLE"}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400">{agent.role}</div>
                  <div className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-1">
                    <div className="text-xs text-slate-500">当前任务</div>
                    <div className="text-xs text-slate-200">{agent.task}</div>
                    {agent.currentAction && agent.status === "RUNNING" && (
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          正在执行
                        </div>
                        <div className="text-xs text-amber-300 font-mono mt-1">{agent.currentAction}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">风险：{agent.risk}</Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                    {agent.startedAt ? <span>🚀 started: {new Date(agent.startedAt).toLocaleString("zh-CN")}</span> : null}
                    {agent.completedAt ? <span>✅ done: {new Date(agent.completedAt).toLocaleString("zh-CN")}</span> : null}
                    {agent.currentTaskId ? <span>🧩 task: {agent.currentTaskId}</span> : null}
                    {agent.sessionId ? <span>🆔 session: {agent.sessionId.slice(0, 12)}...</span> : null}
                    {agent.lastHeartbeatAt ? <span>💓 {Math.floor((Date.now() - new Date(agent.lastHeartbeatAt).getTime()) / 1000)}s ago</span> : null}
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
              {data.timeline.map((item, idx) => {
                const eventType = item.match(/^([🏛️🎯🚀✅🟡🔴⚙️📍📝])/)?.[1] || "";
                const typeLabels: Record<string, string> = {
                  "🏛️": "阶段", "🎯": "目标", "🚀": "启动", "✅": "完成", "🟡": "进行", "🔴": "阻塞", "⚙️": "工作流", "📍": "检查点", "📝": "日志"
                };
                const typeLabel = typeLabels[eventType] || "系统";
                
                // Extract embedded metadata like [depends:...] [dur:...] [session:...]
                const metadataMatch = item.match(/(\[[^\]]+\])/g);
                const metadata = metadataMatch || [];
                const cleanMessage = item.replace(/(\[[^\]]+\])/g, "").trim();
                
                return (
                  <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500 shrink-0 mt-0.5">{typeLabel}</Badge>
                      <span className="text-xs text-slate-300">{cleanMessage}</span>
                    </div>
                    {metadata.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-8">
                        {metadata.map((m, mi) => {
                          const colorClass = m.includes("depends") ? "text-blue-400 bg-blue-950/30" 
                            : m.includes("dur") ? "text-green-400 bg-green-950/30"
                            : m.includes("session") ? "text-purple-400 bg-purple-950/30"
                            : m.includes("task") ? "text-amber-400 bg-amber-950/30"
                            : m.includes("started") ? "text-cyan-400 bg-cyan-950/30"
                            : "text-slate-500 bg-slate-900/60";
                          return (
                            <span key={mi} className={`text-[10px] px-1.5 py-0.5 rounded ${colorClass}`}>
                              {m.replace(/[\[\]]/g, "")}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-red-900/50">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> 当前阻塞</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300 space-y-2">
              {data.blockers.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2">🔴 {item}</div>
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