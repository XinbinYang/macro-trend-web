import { loadMission, saveMission, updateAgent } from "@/lib/mission-control";

type AgentStatus = "IDLE" | "RUNNING" | "DONE" | "BLOCKED";

function main() {
  const [name, status, ...taskParts] = process.argv.slice(2);
  if (!name || !status) {
    console.log("Usage: tsx scripts/sync-agent-status.ts <AGENT_NAME> <IDLE|RUNNING|DONE|BLOCKED> [task text]");
    process.exit(1);
  }

  const task = taskParts.join(" ").trim();
  const data = loadMission();
  updateAgent(data, name, status as AgentStatus, task);
  saveMission(data);
  console.log(`Updated agent ${name} -> ${status}`);
}

main();