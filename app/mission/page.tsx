"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bot, CheckCircle2, Clock3, Flag, Layers3, Play, RefreshCw, Target, Timer, Workflow, Zap } from "lucide-react";

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
  // 三大中枢联动：任务来源标签
  source?: "Macro" | "Portfolio Drift" | "Monitor Trigger" | "Manual" | "System";
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
  checkpoints?: string[];
  workflow?: {
    currentStage: string;
    nextStage: string;
    progress: number;
  };
}

function statusBadge(status: string) {
  if (status === "DONE") return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">🟢 DONE</Badge>;
  if (status === "DOING") return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">🟡 DOING</Badge>;
  if (status === "BLOCKED") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">🔴 BLOCKED</Badge>;
  return <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30">⚪ TODO</Badge>;
}

// Parse timeline into structured events for better timeline visualization
interface TimelineEvent {
  id: string;
  emoji: string;
  type: "phase" | "checkpoint" | "task" | "agent" | "blocker" | "workflow" | "note";
  title: string;
  details: Record<string, string>;
  timestamp: string;
  isActive: boolean;
}

function parseTimelineEvent(line: string, idx: number): TimelineEvent {
  const emojiMatch = line.match(/^([🏛️🎯🚀✅🟡🔴⚙️📍📝🧩])/);
  const emoji = emojiMatch?.[1] || "📝";
  
  const typeMap: Record<string, TimelineEvent["type"]> = {
    "🏛️": "phase",
    "📍": "checkpoint",
    "🟡": "task",
    "🟢": "task",
    "🔴": "blocker",
    "🚀": "agent",
    "✅": "agent",
    "⚙️": "workflow",
    "📝": "note",
    "🧩": "task"
  };
  
  // Extract metadata
  const metadataMatch = line.match(/(\[[^\]]+\])/g) || [];
  const details: Record<string, string> = {};
  metadataMatch.forEach(m => {
    const inner = m.replace(/[\[\]]/g, "");
    const [key, ...valueParts] = inner.split(":");
    if (key && valueParts.length) {
      details[key] = valueParts.join(":");
    }
  });
  
  const cleanMessage = line.replace(/^([🏛️🎯🚀✅🟡🔴⚙️📍📝🧩])\s*/, "").replace(/(\[[^\]]+\])/g, "").trim();
  
  return {
    id: `${idx}-${Date.now()}`,
    emoji,
    type: typeMap[emoji] || "note",
    title: cleanMessage,
    details,
    timestamp: "",
    isActive: idx === 0
  };
}

export default function MissionPage() {
  const [data, setData] = useState<MissionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLastFetchedAt] = useState<Date | null>(null);

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

  // Parse timeline into structured events
  const timelineEvents = useMemo(() => {
    if (!data) return [];
    return data.timeline.map((line, idx) => parseTimelineEvent(line, idx));
  }, [data]);

  // Calculate task progress
  const taskProgress = useMemo(() => {
    if (!data) return { total: 0, done: 0, percent: 0 };
    const total = data.tasks.length;
    const done = data.summary.done;
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [data]);

  // Group tasks by status for structured view
  const tasksByStatus = useMemo(() => {
    if (!data) return { DOING: [], TODO: [], DONE: [], BLOCKED: [] };
    return {
      DOING: data.tasks.filter(t => t.status === "DOING"),
      TODO: data.tasks.filter(t => t.status === "TODO"),
      DONE: data.tasks.filter(t => t.status === "DONE"),
      BLOCKED: data.tasks.filter(t => t.status === "BLOCKED")
    };
  }, [data]);

  // Get active agents (RUNNING status)
  const activeAgents = useMemo(() => {
    if (!data) return [];
    return data.agents.filter(a => a.status === "RUNNING");
  }, [data]);

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
      {/* ========== COMMAND CENTER BAR ========== */}
      <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-bold text-lg">MISSION CONTROL</span>
          </div>
          
          {/* Phase → Checkpoint → Progress Flow */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-700">
              <Flag className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">PHASE</span>
              <span className="text-sm font-medium text-slate-100">{data.summary.phase.split("·")[0]}</span>
            </div>
            
            <span className="text-slate-500">→</span>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-700">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-400">CHECKPOINT</span>
              <span className="text-sm font-medium text-purple-300">
                {timelineEvents.find(e => e.type === "checkpoint")?.title || "N/A"}
              </span>
            </div>
            
            <span className="text-slate-500">→</span>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-700">
              <Workflow className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">PROGRESS</span>
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${taskProgress.percent}%` }}
                />
              </div>
              <span className="text-sm font-medium text-emerald-300">{taskProgress.percent}%</span>
            </div>
          </div>
          
          <button
            onClick={fetchMission}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {/* Active Agents Mini Bar */}
        {activeAgents.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-4 flex-wrap">
            <span className="text-xs text-slate-500">ACTIVE AGENTS:</span>
            {activeAgents.map(agent => (
              <div key={agent.name} className="flex items-center gap-2 px-2 py-1 rounded bg-amber-950/30 border border-amber-700/30">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-300 font-medium">{agent.name}</span>
                {agent.currentAction && (
                  <span className="text-[10px] text-amber-400/70">→ {agent.currentAction}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== BLOCKERS - MORE PROMINENT ========== */}
      {data.blockers.length > 0 && (
        <Card className="bg-red-950/20 border-red-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> 
              🚨 当前阻塞 / BLOCKERS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.blockers.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 flex items-start gap-3">
                  <span className="text-red-400 text-lg">🔴</span>
                  <div>
                    <div className="text-sm text-red-200 font-medium">{item}</div>
                    <div className="text-xs text-red-400/70 mt-1">需要解决后才能继续执行</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Layers3 className="w-5 h-5 text-blue-400" /> 
              任务作战室 / TASK WAR ROOM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Structured Task Display: Group by Status */}
            {tasksByStatus.DOING.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Play className="w-3 h-3" /> 执行中 / DOING
                </div>
                {tasksByStatus.DOING.map((task) => (
                  <div key={task.id} className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-amber-400/70">{task.id} · {task.module} · {task.priority}</span>
                          {/* 三大中枢联动：来源标签 */}
                          {task.source && (
                            <Badge className={`text-[10px] px-1.5 py-0 ${
                              task.source === "Macro" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                              task.source === "Portfolio Drift" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                              task.source === "Monitor Trigger" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            }`}>
                              {task.source}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-medium text-slate-100">{task.title}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">👤 {task.owner}</Badge>
                        {statusBadge(task.status)}
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{task.note}</div>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                      {task.dependsOn?.length ? <span>🔗 depends: {task.dependsOn.join(", ")}</span> : null}
                      {task.startedAt ? <span>🚀 started: {new Date(task.startedAt).toLocaleString("zh-CN")}</span> : null}
                      {task.estimatedHours ? <span>⏱️ est: {task.estimatedHours}h</span> : null}
                      {task.startedAt ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          elapsed: {Math.round((Date.now() - new Date(task.startedAt).getTime()) / 60000)}min
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tasksByStatus.TODO.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <Clock3 className="w-3 h-3" /> 待执行 / TODO
                </div>
                {tasksByStatus.TODO.map((task) => (
                  <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2 opacity-70">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-500">{task.id} · {task.module} · {task.priority}</span>
                          {/* 三大中枢联动：来源标签 */}
                          {task.source && (
                            <Badge className={`text-[10px] px-1.5 py-0 ${
                              task.source === "Macro" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                              task.source === "Portfolio Drift" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                              task.source === "Monitor Trigger" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            }`}>
                              {task.source}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-medium text-slate-300">{task.title}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">👤 {task.owner}</Badge>
                        {statusBadge(task.status)}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{task.note}</div>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
                      {task.dependsOn?.length ? <span>🔗 depends: {task.dependsOn.join(", ")}</span> : null}
                      {task.estimatedHours ? <span>⏱️ est: {task.estimatedHours}h</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tasksByStatus.BLOCKED.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3" /> 阻塞 / BLOCKED
                </div>
                {tasksByStatus.BLOCKED.map((task) => (
                  <div key={task.id} className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="text-xs text-red-400/70">{task.id} · {task.module} · {task.priority}</div>
                        <div className="text-sm font-medium text-slate-100">{task.title}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">👤 {task.owner}</Badge>
                        {statusBadge(task.status)}
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{task.note}</div>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                      {task.dependsOn?.length ? <span>🔗 depends: {task.dependsOn.join(", ")}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tasksByStatus.DONE.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> 已完成 / DONE
                </div>
                {tasksByStatus.DONE.slice(0, 3).map((task) => (
                  <div key={task.id} className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 space-y-1 opacity-60">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-emerald-500/70">{task.id}</span>
                          {/* 三大中枢联动：来源标签 */}
                          {task.source && (
                            <Badge className={`text-[10px] px-1.5 py-0 ${
                              task.source === "Macro" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                              task.source === "Portfolio Drift" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                              task.source === "Monitor Trigger" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            }`}>
                              {task.source}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">{task.title}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(task.status)}
                        {task.startedAt && task.completedAt ? (
                          <span className="text-[10px] text-emerald-500/70">
                            {Math.round((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 60000)}min
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {tasksByStatus.DONE.length > 3 && (
                  <div className="text-xs text-slate-500 pl-2">+ {tasksByStatus.DONE.length - 3} more completed</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" /> 
                代理作战中心 / AGENT WAR ROOM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Active Agents - Running */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Zap className="w-3 h-3" /> 作战中 / ACTIVE
                </div>
                {data.agents.filter(a => a.status === "RUNNING").map((agent) => (
                  <div key={agent.name} className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                        <div className="text-sm font-medium text-slate-100">🤖 {agent.name}</div>
                      </div>
                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                        🟡 RUNNING
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400">{agent.role}</div>
                    
                    {/* Current Task & Action - More Prominent */}
                    <div className="rounded-lg bg-slate-900/80 px-3 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-slate-500">当前任务</span>
                      </div>
                      <div className="text-sm text-slate-200 font-medium">{agent.task}</div>
                      
                      {agent.currentAction && (
                        <div className="mt-2 pt-2 border-t border-slate-700">
                          <div className="flex items-center gap-2">
                            <Play className="w-3 h-3 text-amber-400 animate-pulse" />
                            <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">正在执行</span>
                          </div>
                          <div className="text-sm text-amber-300 font-mono mt-1 bg-amber-950/30 px-2 py-1 rounded">
                            {agent.currentAction}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
                        风险：{agent.risk}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                      {agent.currentTaskId ? <span className="text-blue-400">🧩 task: {agent.currentTaskId}</span> : null}
                      {agent.sessionId ? <span className="text-purple-400">🆔 {agent.sessionId.slice(0, 16)}</span> : null}
                      {agent.startedAt ? <span className="text-cyan-400">🚀 {new Date(agent.startedAt).toLocaleTimeString("zh-CN")}</span> : null}
                      {agent.lastHeartbeatAt && (
                        <span className="text-amber-400/70 flex items-center gap-1">
                          💓 {Math.floor((Date.now() - new Date(agent.lastHeartbeatAt).getTime()) / 1000)}s ago
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Idle/Done Agents */}
              {data.agents.filter(a => a.status !== "RUNNING").length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <Clock3 className="w-3 h-3" /> 待命 / IDLE
                  </div>
                  {data.agents.filter(a => a.status !== "RUNNING").map((agent) => (
                    <div key={agent.name} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-400">🤖 {agent.name}</div>
                        <Badge className={agent.status === "DONE" ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-slate-500/15 text-slate-300 border-slate-500/30"}>
                          {agent.status === "DONE" ? "🟢 DONE" : "⚪ IDLE"}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500">{agent.role}</div>
                      <div className="text-xs text-slate-500">{agent.task}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-purple-400" /> 
                作战日志 / EXECUTION LOG
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Group timeline by type for better structure */}
              {["phase", "checkpoint", "task", "agent", "workflow", "note", "blocker"].map((type) => {
                const typeEvents = timelineEvents.filter(e => e.type === type);
                if (typeEvents.length === 0) return null;
                
                const typeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
                  phase: { label: "阶段 / PHASE", color: "text-blue-400", icon: <Flag className="w-3 h-3" /> },
                  checkpoint: { label: "检查点 / CHECKPOINT", color: "text-purple-400", icon: <Target className="w-3 h-3" /> },
                  task: { label: "任务 / TASK", color: "text-amber-400", icon: <Layers3 className="w-3 h-3" /> },
                  agent: { label: "代理 / AGENT", color: "text-emerald-400", icon: <Bot className="w-3 h-3" /> },
                  workflow: { label: "工作流 / WORKFLOW", color: "text-cyan-400", icon: <Workflow className="w-3 h-3" /> },
                  blocker: { label: "阻塞 / BLOCKER", color: "text-red-400", icon: <AlertTriangle className="w-3 h-3" /> },
                  note: { label: "日志 / LOG", color: "text-slate-400", icon: <Clock3 className="w-3 h-3" /> },
                };
                
                const info = typeLabels[type];
                
                return (
                  <div key={type} className="space-y-2">
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${info.color}`}>
                      {info.icon} {info.label}
                    </div>
                    {typeEvents.slice(0, 5).map((event) => (
                      <div 
                        key={event.id} 
                        className={`rounded-lg border px-3 py-2 flex flex-col gap-1 ${
                          event.isActive 
                            ? "border-amber-500/30 bg-amber-950/20" 
                            : "border-slate-800 bg-slate-950/40"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-base">{event.emoji}</span>
                          <span className={`text-xs ${event.isActive ? "text-amber-300" : "text-slate-300"}`}>
                            {event.title}
                          </span>
                        </div>
                        {Object.keys(event.details).length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-6">
                            {Object.entries(event.details).map(([k, v]) => (
                              <span 
                                key={`${k}-${v}`} 
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-400"
                              >
                                {k}:{v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {typeEvents.length > 5 && (
                      <div className="text-[10px] text-slate-500 pl-2">+ {typeEvents.length - 5} more</div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Dev Feed - kept minimal */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" /> 
                DEV FEED
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data.devFeed?.commits || []).length > 0 ? (
                (data.devFeed?.commits || []).map((commit) => (
                  <div key={commit.sha} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <div className="text-[11px] text-slate-500">{commit.sha.slice(0, 7)}</div>
                    <div className="text-xs text-slate-300">{commit.message}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">No dev activity</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}