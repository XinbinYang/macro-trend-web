import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bot, Clock3, Flag, Layers3, Target } from "lucide-react";

const summary = {
  objective: "网页端作战驾驶舱：稳定版恢复 → Mission Control MVP → 宏观研究层重建",
  phase: "P1 · Mission Control MVP",
  done: 6,
  doing: 4,
  blocked: 1,
  updatedAt: new Date().toLocaleString("zh-CN"),
};

const tasks = [
  {
    id: "WEB-001",
    title: "恢复网站可访问与可部署",
    owner: "main",
    module: "frontend",
    priority: "P0",
    status: "DONE",
    note: "首页已恢复，client-side exception 已修复",
  },
  {
    id: "WEB-002",
    title: "关闭低价值 AI 新闻点评与翻译调用",
    owner: "main",
    module: "frontend",
    priority: "P0",
    status: "DONE",
    note: "新闻 AI 点评/翻译、资产 AI 分析已关闭",
  },
  {
    id: "OPS-001",
    title: "Mission Control 页面信息架构落地",
    owner: "main",
    module: "ops",
    priority: "P1",
    status: "DOING",
    note: "当前页面已建立 MVP 框架",
  },
  {
    id: "OPS-002",
    title: "任务追踪数据结构定义",
    owner: "kimi",
    module: "ops",
    priority: "P1",
    status: "DOING",
    note: "先用静态任务流，后续接真实动态状态",
  },
  {
    id: "OPS-003",
    title: "子代理派活追踪接入",
    owner: "minimax",
    module: "ops",
    priority: "P1",
    status: "TODO",
    note: "待 Mission Control MVP 稳定后接入",
  },
  {
    id: "MACRO-001",
    title: "中国宏观数据正式重建",
    owner: "main",
    module: "data",
    priority: "P1",
    status: "TODO",
    note: "当前仍是降级展示",
  },
  {
    id: "BOND-001",
    title: "中国债券数据正式重建",
    owner: "main",
    module: "data",
    priority: "P1",
    status: "BLOCKED",
    note: "需先确定运行时数据服务方案，避免再次破坏构建链",
  },
];

const agents = [
  {
    name: "GPT-5.4 / main",
    role: "总控 / 战略 / 执行调度",
    status: "RUNNING",
    task: "Mission Control MVP + 网页端路线图",
    risk: "LOW",
  },
  {
    name: "MiniMax Highspeed",
    role: "前端快速开发 / 热修",
    status: "IDLE",
    task: "待接入子代理追踪模块",
    risk: "LOW",
  },
  {
    name: "Kimi 2.5",
    role: "信息架构 / 长上下文整理 / 审计",
    status: "IDLE",
    task: "待输出结构化路线图文档",
    risk: "LOW",
  },
];

const timeline = [
  "🟢 网站已恢复可访问",
  "🟢 新闻 AI 点评 / 翻译 / 资产 AI 分析已关闭",
  "🟢 宏观置信度已修正为 50% 中性基线",
  "🟡 Mission Control MVP 页面开始落地",
  "🔴 中国债券/中国宏观仍处于降级展示，待稳态重建",
];

function statusBadge(status: string) {
  if (status === "DONE") return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">🟢 DONE</Badge>;
  if (status === "DOING") return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">🟡 DOING</Badge>;
  if (status === "BLOCKED") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">🔴 BLOCKED</Badge>;
  return <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30">⚪ TODO</Badge>;
}

export default function MissionPage() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
          <Target className="w-4 h-4" /> Mission Control
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-50">执行中枢 / 任务作战看板</h1>
        <p className="text-sm text-slate-400">🧭 当前用于跟踪网页端建设、子代理协同、阻塞项与阶段目标。</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><Flag className="w-5 h-5 text-amber-500" /> 总任务概览</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <div><span className="text-slate-500">🎯 当前总目标：</span> {summary.objective}</div>
          <div><span className="text-slate-500">📍 当前阶段：</span> {summary.phase}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">🟢 已完成</div><div className="text-xl font-bold">{summary.done}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">🟡 进行中</div><div className="text-xl font-bold">{summary.doing}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">🔴 阻塞</div><div className="text-xl font-bold">{summary.blocked}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-slate-500 text-xs">⏱️ 更新时间</div><div className="text-sm font-medium">{summary.updatedAt}</div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2"><Layers3 className="w-5 h-5 text-blue-400" /> 当前任务列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">{task.id} · {task.module} · {task.priority}</div>
                    <div className="text-sm font-medium text-slate-100">{task.title}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">👤 {task.owner}</Badge>
                    {statusBadge(task.status)}
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
              {agents.map((agent) => (
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
              {timeline.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">{item}</div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-red-900/50">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> 当前阻塞</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300 space-y-2">
              <div>🔴 中国债券 / 中国宏观当前仍在降级模式。</div>
              <div>⚠️ 下一阶段必须先设计稳定运行时数据接入，不再直接把高风险调用塞进构建链。</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}