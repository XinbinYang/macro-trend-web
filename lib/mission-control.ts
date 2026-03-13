import fs from "node:fs";
import path from "node:path";

export type TaskStatus = "TODO" | "DOING" | "DONE" | "BLOCKED";
export type AgentRunStatus = "IDLE" | "RUNNING" | "DONE" | "BLOCKED";

export interface MissionTask {
  id: string;
  title: string;
  owner: string;
  module: string;
  priority: string;
  status: TaskStatus;
  note: string;
}

export interface MissionAgent {
  name: string;
  role: string;
  status: string;
  task: string;
  risk: string;
}

export interface MissionData {
  summary: {
    objective: string;
    phase: string;
    done: number;
    doing: number;
    blocked: number;
    updatedAt: string;
  };
  tasks: MissionTask[];
  agents: MissionAgent[];
  timeline: string[];
  blockers: string[];
}

const filePath = path.join(process.cwd(), "data", "mission", "status.json");

export function getMissionFilePath() {
  return filePath;
}

export function loadMission(): MissionData {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function saveMission(data: MissionData) {
  data.summary.done = data.tasks.filter((t) => t.status === "DONE").length;
  data.summary.doing = data.tasks.filter((t) => t.status === "DOING").length;
  data.summary.blocked = data.tasks.filter((t) => t.status === "BLOCKED").length;
  data.summary.updatedAt = new Date().toISOString();

  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

function emojiForTask(status: TaskStatus) {
  if (status === "DONE") return "🟢";
  if (status === "DOING") return "🟡";
  if (status === "BLOCKED") return "🔴";
  return "⚪";
}

function emojiForAgent(status: AgentRunStatus) {
  if (status === "RUNNING") return "🟡";
  if (status === "DONE") return "🟢";
  if (status === "BLOCKED") return "🔴";
  return "⚪";
}

export function appendTimeline(data: MissionData, text: string) {
  data.timeline.unshift(text);
  data.timeline = data.timeline.slice(0, 30);
}

export function updateTask(data: MissionData, id: string, status: TaskStatus, note?: string) {
  const task = data.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`Task not found: ${id}`);
  task.status = status;
  if (typeof note === "string" && note.trim()) task.note = note.trim();
  appendTimeline(data, `${emojiForTask(status)} ${task.id} ${task.title}`);
  return task;
}

export function updateAgent(data: MissionData, name: string, status: AgentRunStatus, taskText?: string, risk?: string) {
  const agent = data.agents.find((a) => a.name === name);
  if (!agent) throw new Error(`Agent not found: ${name}`);
  agent.status = status;
  if (typeof taskText === "string" && taskText.trim()) agent.task = taskText.trim();
  if (typeof risk === "string" && risk.trim()) agent.risk = risk.trim();
  appendTimeline(data, `${emojiForAgent(status)} AGENT ${name} -> ${status}${taskText ? ` · ${taskText}` : ""}`);
  return agent;
}

export function addBlocker(data: MissionData, text: string) {
  const blocker = text.trim();
  if (!blocker) throw new Error("Missing blocker text");
  data.blockers.unshift(blocker);
  data.blockers = data.blockers.slice(0, 10);
  appendTimeline(data, `🔴 BLOCKER ${blocker}`);
  return blocker;
}

export function addNote(data: MissionData, text: string) {
  const note = text.trim();
  if (!note) throw new Error("Missing timeline note");
  appendTimeline(data, `📝 ${note}`);
  return note;
}

/**
 * Unified event logger for external agents/systems
 * Use this to inject events into mission timeline from anywhere in the system
 */
export function logEvent(data: MissionData, event: {
  type: "phase" | "objective" | "subagent_spawn" | "subagent_complete" | "workflow" | "checkpoint";
  message: string;
  details?: Record<string, string>;
}) {
  const emoji: Record<string, string> = {
    phase: "🏛️",
    objective: "🎯",
    subagent_spawn: "🚀",
    subagent_complete: "✅",
    workflow: "⚙️",
    checkpoint: "📍",
  };
  
  const e = emoji[event.type] || "📝";
  let line = `${e} ${event.message}`;
  
  if (event.details) {
    const detailsStr = Object.entries(event.details)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    line += ` [${detailsStr}]`;
  }
  
  appendTimeline(data, line);
  return line;
}
