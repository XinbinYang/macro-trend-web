import fs from "node:fs";
import path from "node:path";

type AgentStatus = "IDLE" | "RUNNING" | "DONE" | "BLOCKED";

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
    status: string;
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
  data.summary.updatedAt = new Date().toISOString();
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

function emojiFor(status: AgentStatus) {
  if (status === "RUNNING") return "🟡";
  if (status === "DONE") return "🟢";
  if (status === "BLOCKED") return "🔴";
  return "⚪";
}

function main() {
  const [name, status, ...taskParts] = process.argv.slice(2);
  if (!name || !status) {
    console.log("Usage: tsx scripts/sync-agent-status.ts <AGENT_NAME> <IDLE|RUNNING|DONE|BLOCKED> [task text]");
    process.exit(1);
  }

  const task = taskParts.join(" ").trim();
  const data = loadMission();
  const agent = data.agents.find((a) => a.name === name);

  if (!agent) {
    console.error(`Agent not found: ${name}`);
    process.exit(1);
  }

  agent.status = status;
  if (task) agent.task = task;

  data.timeline.unshift(`${emojiFor(status as AgentStatus)} AGENT ${name} -> ${status}${task ? ` · ${task}` : ""}`);
  data.timeline = data.timeline.slice(0, 30);

  saveMission(data);
  console.log(`Updated agent ${name} -> ${status}`);
}

main();
