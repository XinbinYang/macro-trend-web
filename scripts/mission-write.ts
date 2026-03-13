import { loadMission, saveMission, updateTask, updateAgent, addBlocker, addNote } from "@/lib/mission-control";

type TaskStatus = "TODO" | "DOING" | "DONE" | "BLOCKED";
type AgentStatus = "IDLE" | "RUNNING" | "DONE" | "BLOCKED";

async function main() {
  const [action, ...rest] = process.argv.slice(2);
  const data = loadMission();

  if (action === "task") {
    const [id, status, ...noteParts] = rest;
    updateTask(data, id, status as TaskStatus, noteParts.join(" "));
    saveMission(data);
    console.log(`mission: task ${id} -> ${status}`);
    return;
  }

  if (action === "agent") {
    const [name, status, ...taskParts] = rest;
    updateAgent(data, name, status as AgentStatus, taskParts.join(" "));
    saveMission(data);
    console.log(`mission: agent ${name} -> ${status}`);
    return;
  }

  if (action === "blocker") {
    addBlocker(data, rest.join(" "));
    saveMission(data);
    console.log("mission: blocker added");
    return;
  }

  if (action === "note") {
    addNote(data, rest.join(" "));
    saveMission(data);
    console.log("mission: note added");
    return;
  }

  console.log(`Usage:
  npm run mission:write -- task <TASK_ID> <TODO|DOING|DONE|BLOCKED> [note]
  npm run mission:write -- agent <AGENT_NAME> <IDLE|RUNNING|DONE|BLOCKED> [task]
  npm run mission:write -- blocker <text>
  npm run mission:write -- note <text>`);
}

main();
