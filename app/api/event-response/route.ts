import { NextResponse } from "next/server";
import { ALL_EVENT_TEMPLATES } from "@/lib/config/event-templates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get("eventType");

  if (!eventType) {
    // 返回所有事件类型列表
    return NextResponse.json({
      success: true,
      events: Object.entries(ALL_EVENT_TEMPLATES).map(([key, t]) => ({
        eventType: key,
        displayName: t.displayName,
        description: t.description,
        triggerDimension: t.triggerDimension,
        frequency: t.frequency,
      })),
    });
  }

  const template = ALL_EVENT_TEMPLATES[eventType];
  if (!template) {
    return NextResponse.json(
      { success: false, error: `Unknown eventType: ${eventType}` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: template,
    generatedAt: new Date().toISOString(),
  });
}
