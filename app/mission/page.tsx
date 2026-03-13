"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bot, Flag, RefreshCw, Target, Workflow, Zap, Clock, CheckCircle2, Circle, PlayCircle, Ban } from "lucide-react";
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

// Owner ↔ Agent alias mapping (used for task highlight/filter)
const OWNER_AGENT_MAP: Record<string, string[]> = {
  "main": ["GPT-5.4", "main", "GPT-5.4 / main"],
  "minimax": ["MiniMax", "minimax"],
  "system": ["System", "system"],
  "kimi": ["Kimi", "kimi"],
};

// Agent display name mapping (show CN names on UI)
const AGENT_CN: Record<string, string> = {
  "Data-Nexus-Agent": "数据工程师",
  "Macro-Oracle-Agent": "经济学家",
  "Alpha-Hunter-Agent": "量化研究员",
  "Portfolio-Synthesizer-Agent": "投资经理",
  "minimax-engineer": "系统工程师",
  "main": "AI宏观作手",
  "GPT-5.4 / main": "AI宏观作手",
};

// Allowlist to hide terminal test noise in mission UI
const AGENT_ALLOWLIST = new Set<string>(Object.keys(AGENT_CN));

function normalizeAgentName(agent: string): string {
  return agent?.trim() || "";
}

function displayAgentName(agent: string): string {
  const key = normalizeAgentName(agent);
  return AGENT_CN[key] ? `${AGENT_CN[key]} · ${key}` : key;
}

// Task owner display mapping (keep raw key for filtering/audit)
const OWNER_CN: Record<string, string> = {
  main: "AI宏观作手",
  minimax: "系统工程师",
  system: "系统自动",
  kimi: "数据工程师",
};

function displayOwner(owner: string): string {
  const key = (owner || "").trim();
  return OWNER_CN[key] ? `${OWNER_CN[key]} · ${key}` : key;
}

// STALE threshold in seconds
const STALE_THRESHOLD = 120;

// Hide DONE agents after this many seconds (default 5 minutes)
const DONE_FOLD_AFTER = 5 * 60;

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

function FreshnessBadge({ updatedAt }: { updatedAt: string }) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  
  useEffect(() => {
    const update = () => {
      const updated = new Date(updatedAt).getTime();
      const now = Date.now();
      setSecondsAgo(Math.floor((now - updated) / 1000));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [updatedAt]);

  const isStale = secondsAgo > STALE_THRESHOLD;
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${isStale ? "text-red-400 font-bold" : "text-slate-500"}`}>
      <Clock className="w-3 h-3" />
      🕒 {secondsAgo}s ago
      {isStale && <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-[10px]">STALE</span>}
    </span>
  );
}

function LiveAgentCard({ agent, onClick, isSelected }: { agent: LiveAgentStatus; onClick?: () => void; isSelected?: boolean }) {
  const visual = agentVisual(agent.status || "idle");
  const typedOutput = useTypewriter(agent.output || "");
  const progress = typeof agent.progress === "number" ? Math.max(0, Math.min(100, agent.progress)) : 0;

  return (
    <div 
      onClick={onClick}
      className={`rounded-xl border p-4 space-y-3 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? "border-amber-500/50 bg-amber-950/20" 
          : "border-slate-800 bg-slate-950/60 hover:border-slate-600"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${visual.dot}`} />
          <div className="text-sm font-medium text-slate-100">🤖 {displayAgentName(agent.agent)}</div>
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

      <div className="flex items-center justify-between">
        <FreshnessBadge updatedAt={agent.updated_at} />
      </div>
    </div>
  );
}

function TaskCard({ 
  task, 
  allTasks, 
  isHighlighted,
  onClick 
}: { 
  task: MissionTask; 
  allTasks: MissionTask[];
  isHighlighted?: boolean;
  onClick?: () => void;
}) {
  const statusStyles: Record<TaskStatus, string> = {
    TODO: "border-slate-700 bg-slate-900/40",
    DOING: "border-amber-500 bg-amber-950/20 animate-pulse-border",
    DONE: "border-emerald-600 bg-emerald-950/10",
    BLOCKED: "border-red-500 bg-red-950/20 animate-breathe-red",
  };

  const statusIcons: Record<TaskStatus, React.ReactNode> = {
    TODO: <Circle className="w-4 h-4 text-slate-500" />,
    DOING: <PlayCircle className="w-4 h-4 text-amber-500" />,
    DONE: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    BLOCKED: <Ban className="w-4 h-4 text-red-500" />,
  };

  const priorityColors: Record<string, string> = {
    P0: "text-red-400 bg-red-500/15",
    P1: "text-amber-400 bg-amber-500/15",
    P2: "text-blue-400 bg-blue-500/15",
  };

  // Find dependent tasks
  const dependsOnTasks = task.dependsOn?.map(depId => allTasks.find(t => t.id === depId)).filter(Boolean) as MissionTask[] | undefined;

  return (
    <div 
      onClick={onClick}
      className={`rounded-lg border p-3 space-y-2 cursor-pointer transition-all duration-200 ${
        isHighlighted 
          ? "ring-2 ring-amber-500/50 border-amber-500" 
          : statusStyles[task.status]
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {statusIcons[task.status]}
          <span className="text-xs text-slate-500 font-mono">{task.id}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityColors[task.priority] || "text-slate-400 bg-slate-700"}`}>
          {task.priority}
        </span>
      </div>
      
      <div className="text-sm text-slate-200 font-medium line-clamp-2">{task.title}</div>
      
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          👤 {displayOwner(task.owner)}
        </span>
        <span className="text-xs text-slate-500">
          📦 {task.module}
        </span>
        {task.source && (
          <span className="text-xs text-slate-500">
            📌 {task.source}
          </span>
        )}
      </div>

      {/* dependsOn display */}
      {dependsOnTasks && dependsOnTasks.length > 0 && (
        <div className="pt-1 border-t border-slate-700/50">
          <div className="text-[10px] text-slate-500 mb-1">⬇️ depends on:</div>
          <div className="flex flex-wrap gap-1">
            {dependsOnTasks.map(dep => (
              <span 
                key={dep.id}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  dep.status === "DONE" 
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                    : dep.status === "BLOCKED"
                    ? "border-red-500/30 bg-red-950/20 text-red-400"
                    : "border-slate-600 bg-slate-800 text-slate-400"
                }`}
              >
                {dep.id}
              </span>
            ))}
          </div>
        </div>
      )}

      {task.note && (
        <div className="text-xs text-slate-500 line-clamp-2">{task.note}</div>
      )}
    </div>
  );
}

function StatusColumn({ 
  title, 
  icon, 
  tasks, 
  allTasks,
  highlightOwner,
  onTaskClick
}: { 
  title: string; 
  icon: React.ReactNode;
  tasks: MissionTask[];
  allTasks: MissionTask[];
  highlightOwner?: string;
  onTaskClick?: (owner: string) => void;
}) {
  return (
    <div className="flex-1 min-w-[250px] flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
        {icon}
        <span className="text-sm font-medium text-slate-300">{title}</span>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            allTasks={allTasks}
            isHighlighted={highlightOwner === task.owner}
            onClick={() => onTaskClick?.(task.owner)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-xs text-slate-600 text-center py-4">—</div>
        )}
      </div>
    </div>
  );
}

export default function MissionPage() {
  const [data, setData] = useState<MissionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveAgents, setLiveAgents] = useState<LiveAgentStatus[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
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
    if (!error && data) {
      const now = Date.now();
      const rows = (data as LiveAgentStatus[])
        .map((x) => ({ ...x, agent: normalizeAgentName(x.agent) }))
        .filter((x) => AGENT_ALLOWLIST.has(x.agent))
        // fold DONE after 5 minutes to keep the command view clean
        .filter((x) => {
          const s = String(x.status || "").toLowerCase();
          if (s !== "done") return true;
          const secondsAgo = Math.floor((now - new Date(x.updated_at).getTime()) / 1000);
          return secondsAgo <= DONE_FOLD_AFTER;
        });
      setLiveAgents(rows);
    }
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

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    if (!data) return { TODO: [], DOING: [], DONE: [], BLOCKED: [] };
    return {
      TODO: data.tasks.filter(t => t.status === "TODO"),
      DOING: data.tasks.filter(t => t.status === "DOING"),
      DONE: data.tasks.filter(t => t.status === "DONE"),
      BLOCKED: data.tasks.filter(t => t.status === "BLOCKED"),
    };
  }, [data]);

  // Check if agent matches selected owner
  const getOwnerFromAgent = (agentName: string): string | null => {
    for (const [owner, agents] of Object.entries(OWNER_AGENT_MAP)) {
      if (agents.some(a => agentName.toLowerCase().includes(a.toLowerCase()))) {
        return owner;
      }
    }
    return null;
  };

  const handleAgentClick = (agent: LiveAgentStatus) => {
    const owner = getOwnerFromAgent(agent.agent);
    if (owner) {
      setSelectedOwner(prev => prev === owner ? null : owner);
    }
  };

  const handleTaskOwnerClick = (owner: string) => {
    setSelectedOwner(prev => prev === owner ? null : owner);
  };

  const liveSummary = useMemo(() => {
    const counts = { running: 0, done: 0, idle: 0, error: 0, stale: 0 };
    const now = Date.now();
    liveAgents.forEach((a) => {
      const s = (a.status || "").toLowerCase();
      if (s === "running") counts.running += 1;
      else if (s === "done") counts.done += 1;
      else if (s === "error" || s === "blocked") counts.error += 1;
      else counts.idle += 1;

      const updated = new Date(a.updated_at).getTime();
      const secondsAgo = Math.floor((now - updated) / 1000);
      if (secondsAgo > STALE_THRESHOLD) counts.stale += 1;
    });
    return counts;
  }, [liveAgents]);

  // selectedOwner is used to highlight tasks owned by the clicked agent

  // Calculate stale agents count
  const staleAgentsCount = useMemo(() => {
    return liveAgents.filter(a => {
      const secondsAgo = (Date.now() - new Date(a.updated_at).getTime()) / 1000;
      return secondsAgo > STALE_THRESHOLD;
    }).length;
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
      {/* Enhanced Header with Emoji Structure */}
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
        
        {/* Emoji Structured Summary */}
        <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="rounded-lg bg-slate-950/50 px-3 py-2 text-slate-300 flex items-center gap-2">
            <span>🟢</span><span>完成</span><span className="text-emerald-400 font-bold">{data.summary.done}</span>
          </div>
          <div className="rounded-lg bg-slate-950/50 px-3 py-2 text-slate-300 flex items-center gap-2">
            <span>🟡</span><span>进行中</span><span className="text-amber-400 font-bold">{data.summary.doing}</span>
          </div>
          <div className="rounded-lg bg-slate-950/50 px-3 py-2 text-slate-300 flex items-center gap-2">
            <span>🔴</span><span>阻塞</span><span className="text-red-400 font-bold">{data.summary.blocked}</span>
          </div>
          <div className="rounded-lg bg-slate-950/50 px-3 py-2 text-slate-300 flex items-center gap-2">
            <span>🤖</span><span>运行</span><span className="text-green-400 font-bold">{liveSummary.running}</span>
          </div>
          <div className="rounded-lg bg-slate-950/50 px-3 py-2 text-slate-300 flex items-center gap-2">
            <span>⚠️</span><span>STALE</span><span className={`font-bold ${staleAgentsCount > 0 ? "text-red-400" : "text-slate-400"}`}>{staleAgentsCount}</span>
          </div>
        </div>
      </div>

      {/* Task Board - 4 Columns */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Target className="w-4 h-4" />
          <span>📋 任务看板 / Task Board</span>
          {selectedOwner && (
            <button 
              onClick={() => setSelectedOwner(null)}
              className="ml-2 text-xs text-amber-400 hover:text-amber-300"
            >
              ✕ 清除筛选
            </button>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <StatusColumn 
            title="TODO" 
            icon={<Circle className="w-4 h-4 text-slate-500" />}
            tasks={tasksByStatus.TODO}
            allTasks={data.tasks}
            highlightOwner={selectedOwner || undefined}
            onTaskClick={handleTaskOwnerClick}
          />
          <StatusColumn 
            title="DOING" 
            icon={<PlayCircle className="w-4 h-4 text-amber-500" />}
            tasks={tasksByStatus.DOING}
            allTasks={data.tasks}
            highlightOwner={selectedOwner || undefined}
            onTaskClick={handleTaskOwnerClick}
          />
          <StatusColumn 
            title="DONE" 
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            tasks={tasksByStatus.DONE}
            allTasks={data.tasks}
            highlightOwner={selectedOwner || undefined}
            onTaskClick={handleTaskOwnerClick}
          />
          <StatusColumn 
            title="BLOCKED" 
            icon={<Ban className="w-4 h-4 text-red-500" />}
            tasks={tasksByStatus.BLOCKED}
            allTasks={data.tasks}
            highlightOwner={selectedOwner || undefined}
            onTaskClick={handleTaskOwnerClick}
          />
        </div>
      </div>

      {/* Live Agents with Clickable Cards */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" /> 
            🤖 Agent Status Live
            <span className="text-xs text-slate-500 font-normal ml-2">(点击 Agent 卡片筛选其负责的任务)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveAgents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liveAgents.map((agent) => {
                const owner = getOwnerFromAgent(agent.agent);
                return (
                  <LiveAgentCard 
                    key={agent.agent} 
                    agent={agent} 
                    onClick={() => handleAgentClick(agent)}
                    isSelected={owner === selectedOwner}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-slate-400 text-sm">
              💤 暂无活跃 Agent（等待任务启动/上报）
              <div className="text-xs text-slate-500 mt-2">
                提示：当 Agent 写入 agent_status 后，这里会自动出现卡片并实时更新。
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {data.blockers.length > 0 && (
        <Card className="bg-red-950/20 border-red-800/50">
          <CardHeader className="pb-2"><CardTitle className="text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> 🚨 当前阻塞 / BLOCKERS</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">{data.blockers.map((item, idx) => <div key={idx} className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 flex items-start gap-3"><span className="text-red-400 text-lg">🔴</span><div><div className="text-sm text-red-200 font-medium">{item}</div><div className="text-xs text-red-400/70 mt-1">需要解决后才能继续执行</div></div></div>)}</div></CardContent>
        </Card>
      )}

      <style jsx global>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(245, 158, 11, 0.3); }
          50% { border-color: rgba(245, 158, 11, 0.8); }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
        @keyframes breathe-red {
          0%, 100% { 
            border-color: rgba(239, 68, 68, 0.3);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
          50% { 
            border-color: rgba(239, 68, 68, 0.8);
            box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.3);
          }
        }
        .animate-breathe-red {
          animation: breathe-red 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
