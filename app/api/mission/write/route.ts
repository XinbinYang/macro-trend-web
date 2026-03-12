import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

type TaskStatus = "TODO" | "DOING" | "DONE" | "BLOCKED";

type MissionData = {
  summary: {
    objective: string;
    phase: string;
    done: number;
    doing: number;
    blocked: number;
    updatedAt: string;
  };
  tasks: Array<{
    id: string;
    title: string;
    owner: string;
    module: string;
    priority: string;
    status: TaskStatus;
    note: string;
  }>;
  agents: Array<{
    name: string;
    role: string;
    status: string;
    task: string;
    risk: string;
  }>;
  timeline: string[];
  blockers: string[];
};

const filePath = path.join(process.cwd(), "data", "mission", "status.json");

function loadMission(): MissionData {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveMission(data: MissionData) {
  data.summary.done = data.tasks.filter((t) => t.status === "DONE").length;
  data.summary.doing = data.tasks.filter((t) => t.status === "DOING").length;
  data.summary.blocked = data.tasks.filter((t) => t.status === "BLOCKED").length;
  data.summary.updatedAt = new Date().toISOString();

  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const data = loadMission();

    if (action === "task") {
      const id = body?.id as string;
      const status = body?.status as TaskStatus;
      const note = body?.note as string | undefined;
      const task = data.tasks.find((t) => t.id === id);
      if (!task) {
        return NextResponse.json({ success: false, error: `Task not found: ${id}` }, { status: 200 });
      }
      task.status = status;
      if (typeof note === "string" && note.trim()) task.note = note.trim();
      data.timeline.unshift(`${status === "DONE" ? "🟢" : status === "DOING" ? "🟡" : status === "BLOCKED" ? "🔴" : "⚪"} ${task.id} ${task.title}`);
      data.timeline = data.timeline.slice(0, 30);
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    if (action === "agent") {
      const name = body?.name as string;
      const status = body?.status as string;
      const taskText = body?.task as string | undefined;
      const risk = body?.risk as string | undefined;
      const agent = data.agents.find((a) => a.name === name);
      if (!agent) {
        return NextResponse.json({ success: false, error: `Agent not found: ${name}` }, { status: 200 });
      }
      if (status) agent.status = status;
      if (typeof taskText === "string" && taskText.trim()) agent.task = taskText.trim();
      if (typeof risk === "string" && risk.trim()) agent.risk = risk.trim();
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    if (action === "blocker") {
      const text = String(body?.text || "").trim();
      if (!text) return NextResponse.json({ success: false, error: "Missing blocker text" }, { status: 200 });
      data.blockers.unshift(text);
      data.blockers = data.blockers.slice(0, 10);
      data.timeline.unshift(`🔴 BLOCKER ${text}`);
      data.timeline = data.timeline.slice(0, 30);
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 200 });
  }
}
