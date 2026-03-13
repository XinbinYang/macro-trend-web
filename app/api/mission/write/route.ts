import { NextResponse } from "next/server";
import { addBlocker, addNote, loadMission, saveMission, updateAgent, updateTask, logEvent } from "@/lib/mission-control";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const data = loadMission();

    if (action === "task") {
      updateTask(data, body?.id as string, body?.status, body?.note);
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    if (action === "agent") {
      updateAgent(
        data, 
        body?.name as string, 
        body?.status, 
        body?.task, 
        body?.risk,
        body?.sessionId,
        body?.currentTaskId,
        body?.currentAction
      );
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    if (action === "blocker") {
      addBlocker(data, String(body?.text || ""));
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    if (action === "note") {
      addNote(data, String(body?.text || ""));
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    // New: generic event logging
    if (action === "event") {
      const eventType = String(body?.type || "").trim() as "phase" | "objective" | "subagent_spawn" | "subagent_complete" | "workflow" | "checkpoint";
      const message = String(body?.message || "").trim();
      const validTypes = ["phase", "objective", "subagent_spawn", "subagent_complete", "workflow", "checkpoint"];
      
      if (!eventType || !message) {
        return NextResponse.json({ success: false, error: "Missing type or message" }, { status: 200 });
      }
      if (!validTypes.includes(eventType)) {
        return NextResponse.json({ success: false, error: `Invalid event type: ${eventType}` }, { status: 200 });
      }
      
      logEvent(data, {
        type: eventType,
        message,
        details: body?.details,
      });
      saveMission(data);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 200 });
  }
}