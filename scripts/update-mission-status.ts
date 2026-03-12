import fs from "node:fs";
import path from "node:path";

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

interface MissionData {
  summary: {
    objective: string;
    phase: string;
    done: number;
    doing: number;
    blocked: number;
    updatedAt: string;
  };
  tasks: MissionTask[];
  agents: Array<{
    name: string;
    role: string;
    status: string;
    task: string;
    risk: string;
  }>;
  timeline: string[];
  blockers: string[];
}

const filePath = path.join(process.cwd(), "data", "mission", "status.json");

function loadMission(): MissionData {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function saveMission(data: MissionData) {
  data.summary.done = data.tasks.filter((t) => t.status === "DONE").length;
  data.summary.doing = data.tasks.filter((t) => t.status === "DOING").length;
  data.summary.blocked = data.tasks.filter((t) => t.status === "BLOCKED").length;
  data.summary.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const data = loadMission();

  if (cmd === "task") {
    const id = args[1];
    const status = args[2] as TaskStatus;
    const note = args.slice(3).join(" ");
    const task = data.tasks.find((t) => t.id === id);
    if (!task) throw new Error(`Task not found: ${id}`);
    task.status = status;
    if (note) task.note = note;
    data.timeline.unshift(`${status === "DONE" ? "🟢" : status === "DOING" ? "🟡" : status === "BLOCKED" ? "🔴" : "⚪"} ${task.id} ${task.title}`);
    data.timeline = data.timeline.slice(0, 20);
    saveMission(data);
    console.log(`Updated task ${id} -> ${status}`);
    return;
  }

  if (cmd === "agent") {
    const name = args[1];
    const status = args[2];
    const taskText = args.slice(3).join(" ");
    const agent = data.agents.find((a) => a.name === name);
    if (!agent) throw new Error(`Agent not found: ${name}`);
    agent.status = status;
    if (taskText) agent.task = taskText;
    saveMission(data);
    console.log(`Updated agent ${name} -> ${status}`);
    return;
  }

  if (cmd === "blocker") {
    const text = args.slice(1).join(" ");
    if (!text) throw new Error("Blocker text required");
    data.blockers.unshift(text);
    data.blockers = data.blockers.slice(0, 10);
    data.timeline.unshift(`🔴 BLOCKER ${text}`);
    data.timeline = data.timeline.slice(0, 20);
    saveMission(data);
    console.log("Added blocker");
    return;
  }

  console.log(`Usage:
  tsx scripts/update-mission-status.ts task <TASK_ID> <TODO|DOING|DONE|BLOCKED> [note]
  tsx scripts/update-mission-status.ts agent <AGENT_NAME> <RUNNING|IDLE|DONE|BLOCKED> [task]
  tsx scripts/update-mission-status.ts blocker <text>`);
}

main();