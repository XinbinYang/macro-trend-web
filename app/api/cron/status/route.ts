import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function supabaseReadClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key);
}

export async function GET() {
  try {
    const sb = supabaseReadClient();

    // Latest row that has at least one of the yield fields.
    const { data, error } = await sb
      .from("macro_us")
      .select("date,yield_2y,yield_10y,source,updated_at")
      .or("yield_2y.not.is.null,yield_10y.not.is.null")
      .order("date", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    const latest = data && data.length > 0 ? data[0] : null;

    return NextResponse.json(
      {
        ok: true,
        latest,
        note: "Cron health is inferred from freshest macro_us yields row (date + updated_at).",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
