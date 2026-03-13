import { NextResponse } from "next/server";
import { addBlocker, addNote, loadMission, saveMission, updateAgent, updateTask } from "@/lib/mission-control";

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
      updateAgent(data, body?.name as string, body?.status, body?.task, body?.risk);
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

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 200 });
  }
}