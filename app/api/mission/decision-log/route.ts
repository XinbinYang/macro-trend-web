import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Supabase client (service role for write, anon for read fallback)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xmdvozykqwolmfaycgyz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function sbHeaders(write = false) {
  const key = write && SUPABASE_SERVICE_KEY ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  return {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Prefer": write ? "return=representation" : "return=representation",
  };
}

type DecisionAction = "加仓" | "减仓" | "观望" | "对冲" | "调仓";

interface MacroSnapshot {
  regime: string;
  score: number;
  confidence: number;
  timestamp: string;
}

interface DecisionLog {
  id: string;
  created_at: string;
  title: string;
  action: DecisionAction;
  asset: string;
  rationale: string;
  macro_snapshot: MacroSnapshot | null;
  tags?: string[];
}

async function fetchMacroSnapshot(): Promise<MacroSnapshot | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://macro-trend-web.vercel.app";
    const res = await fetch(`${base}/api/macro-state`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const candidate = json?.data ?? json;
    if (!candidate) return null;
    const { regime, score, confidence, timestamp } = candidate;
    if (typeof regime !== "string" || typeof score !== "number" || typeof confidence !== "number") return null;
    return { regime, score, confidence, timestamp: timestamp || new Date().toISOString() };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/decision_logs?order=created_at.desc`,
      { headers: sbHeaders(false), cache: "no-store" }
    );
    if (!res.ok) {
      const err = await res.text();
      // Table may not exist yet
      if (res.status === 404 || err.includes("does not exist") || err.includes("relation")) {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ success: false, error: err }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 200 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = (typeof body === "object" && body !== null) ? (body as Record<string, unknown>) : {};
  const title = String(payload?.title ?? "").trim();
  const action = payload?.action as DecisionAction;
  const asset = String(payload?.asset ?? "").trim();
  const rationale = String(payload?.rationale ?? "").trim();
  const tags = Array.isArray(payload?.tags)
    ? (payload.tags as unknown[]).map((t) => String(t)).filter(Boolean)
    : null;

  const allowed: DecisionAction[] = ["加仓", "减仓", "观望", "对冲", "调仓"];
  if (!title || !allowed.includes(action) || !asset || !rationale) {
    return NextResponse.json({ success: false, error: "Missing or invalid fields" }, { status: 400 });
  }

  const macroSnapshot = await fetchMacroSnapshot();

  const newItem: DecisionLog = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    title,
    action,
    asset,
    rationale,
    macro_snapshot: macroSnapshot,
    ...(tags && tags.length ? { tags } : {}),
  };

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/decision_logs`,
    {
      method: "POST",
      headers: sbHeaders(true),
      body: JSON.stringify(newItem),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    // Table doesn't exist — return success with note (graceful degradation)
    if (err.includes("does not exist") || err.includes("relation") || res.status === 404) {
      return NextResponse.json({
        success: false,
        error: "decision_logs table not found. Please run the migration.",
        data: newItem,
      }, { status: 200 });
    }
    return NextResponse.json({ success: false, error: err }, { status: 200 });
  }

  const saved = await res.json();
  return NextResponse.json({ success: true, data: Array.isArray(saved) ? saved[0] : newItem });
}
