async function main() {
  const [event, ...rest] = process.argv.slice(2);
  if (!event) {
    console.log(`Usage:
  npm run mission:event -- task_started <taskId> <agentName> [note]
  npm run mission:event -- task_done <taskId> <agentName> [note]
  npm run mission:event -- task_blocked <taskId> <agentName> [note]
  npm run mission:event -- agent_idle <agentName> [task]
  npm run mission:event -- note <text>`);
    process.exit(1);
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  let payload: Record<string, string> = { event };

  if (event === "task_started" || event === "task_done" || event === "task_blocked") {
    const [taskId, agentName, ...noteParts] = rest;
    payload = {
      event,
      taskId: taskId || "",
      agentName: agentName || "",
      note: noteParts.join(" "),
      agentTask: noteParts.join(" "),
    };
  } else if (event === "agent_idle") {
    const [agentName, ...taskParts] = rest;
    payload = {
      event,
      agentName: agentName || "",
      agentTask: taskParts.join(" ") || "等待下一任务",
    };
  } else if (event === "note") {
    payload = {
      event,
      text: rest.join(" "),
    };
  }

  const res = await fetch(`${baseUrl}/api/mission/auto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  console.log(JSON.stringify(json, null, 2));
}

main();