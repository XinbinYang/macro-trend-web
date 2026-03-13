import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xmdvozykqwolmfaycgyz.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent, status, step, progress, output } = body || {};

    if (!agent || !status) {
      return NextResponse.json({ success: false, error: "Missing agent or status" }, { status: 200 });
    }

    const payload = {
      agent,
      status,
      step: step || null,
      progress: typeof progress === "number" ? progress : null,
      output: output || null,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase key not configured" }, { status: 200 });
    }

    const { error } = await supabase
      .from("agent_status")
      .upsert(payload, { onConflict: "agent" });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true, data: payload }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 200 });
  }
}