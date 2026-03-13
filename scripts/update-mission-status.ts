import { loadMission, saveMission, updateTask, updateAgent, addBlocker, addNote } from "@/lib/mission-control";

type TaskStatus = "TODO" | "DOING" | "DONE" | "BLOCKED";
type AgentStatus = "IDLE" | "RUNNING" | "DONE" | "BLOCKED";

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const data = loadMission();

  if (cmd === "task") {
    const id = args[1];
    const status = args[2] as TaskStatus;
    const note = args.slice(3).join(" ");
    updateTask(data, id, status, note);
    saveMission(data);
    console.log(`Updated task ${id} -> ${status}`);
    return;
  }

  if (cmd === "agent") {
    const name = args[1];
    const status = args[2] as AgentStatus;
    const taskText = args.slice(3).join(" ");
    updateAgent(data, name, status, taskText);
    saveMission(data);
    console.log(`Updated agent ${name} -> ${status}`);
    return;
  }

  if (cmd === "blocker") {
    const text = args.slice(1).join(" ");
    addBlocker(data, text);
    saveMission(data);
    console.log("Added blocker");
    return;
  }

  if (cmd === "note") {
    const text = args.slice(1).join(" ");
    addNote(data, text);
    saveMission(data);
    console.log("Added note");
    return;
  }

  console.log(`Usage:
  tsx scripts/update-mission-status.ts task <TASK_ID> <TODO|DOING|DONE|BLOCKED> [note]
  tsx scripts/update-mission-status.ts agent <AGENT_NAME> <IDLE|RUNNING|DONE|BLOCKED> [task]
  tsx scripts/update-mission-status.ts blocker <text>
  tsx scripts/update-mission-status.ts note <text>`);
}

main();