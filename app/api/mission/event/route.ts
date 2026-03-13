import { NextResponse } from "next/server";
import { loadMission, logEvent, saveMission } from "@/lib/mission-control";

/**
 * Event-driven mission write API
 * External agents/systems call this to inject events into mission timeline
 * 
 * POST /api/mission/event
 * Body: {
 *   type: "phase" | "objective" | "subagent_spawn" | "subagent_complete" | "workflow" | "checkpoint",
 *   message: string,
 *   details?: Record<string, string>
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = String(body?.type || "").trim();
    const message = String(body?.message || "").trim();
    
    if (!type || !message) {
      return NextResponse.json(
        { success: false, error: "Missing type or message" },
        { status: 200 }
      );
    }
    
    const validTypes = ["phase", "objective", "subagent_spawn", "subagent_complete", "workflow", "checkpoint"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid event type: ${type}` },
        { status: 200 }
      );
    }
    
    const data = loadMission();
    logEvent(data, {
      type: type as "phase" | "objective" | "subagent_spawn" | "subagent_complete" | "workflow" | "checkpoint",
      message,
      details: body?.details,
    });
    saveMission(data);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 200 }
    );
  }
}
