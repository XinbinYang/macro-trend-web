import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("macro_us")
      .select("*")
      .order("date", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    const latest = data?.[0] || null;

    return NextResponse.json(
      {
        success: true,
        data: {
          region: "US",
          status: latest ? "LIVE" : "OFF",
          updatedAt: new Date().toISOString(),
          asOf: latest?.date || null,
          latest,
          notes: "Monthly macro snapshot from Supabase macro_us (display layer).",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 200 });
  }
}
