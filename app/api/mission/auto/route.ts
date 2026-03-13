import { NextResponse } from "next/server";
import { addNote, loadMission, saveMission, updateAgent, updateTask } from "@/lib/mission-control";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const event = String(body?.event || "").trim();
    const data = loadMission();

    if (event === "task_started") {
      updateTask(data, String(body?.taskId || ""), "DOING", String(body?.note || ""));
      if (body?.agentName) {
        updateAgent(
          data,
          String(body.agentName),
          "RUNNING",
          String(body?.agentTask || body?.note || ""),
          body?.risk,
          body?.sessionId,
          body?.taskId
        );
      }
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    if (event === "task_done") {
      updateTask(data, String(body?.taskId || ""), "DONE", String(body?.note || ""));
      if (body?.agentName) {
        updateAgent(
          data,
          String(body.agentName),
          "DONE",
          String(body?.agentTask || body?.note || ""),
          body?.risk,
          body?.sessionId,
          body?.taskId
        );
      }
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    if (event === "task_blocked") {
      updateTask(data, String(body?.taskId || ""), "BLOCKED", String(body?.note || ""));
      if (body?.agentName) {
        updateAgent(
          data,
          String(body.agentName),
          "BLOCKED",
          String(body?.agentTask || body?.note || ""),
          body?.risk,
          body?.sessionId,
          body?.taskId
        );
      }
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    if (event === "agent_idle") {
      updateAgent(data, String(body?.agentName || ""), "IDLE", String(body?.agentTask || "等待下一任务"), body?.risk, body?.sessionId, body?.taskId);
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    if (event === "note") {
      addNote(data, String(body?.text || ""));
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Unknown event" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 200 });
  }
}