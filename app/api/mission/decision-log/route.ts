import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type DecisionAction = "加仓" | "减仓" | "观望" | "对冲" | "调仓";

interface MacroSnapshot {
  regime: string;
  score: number;
  confidence: number;
  timestamp: string;
}

interface DecisionLog {
  id: string;
  createdAt: string;
  title: string;
  action: DecisionAction;
  asset: string;
  rationale: string;
  macroSnapshot: MacroSnapshot | null;
  tags?: string[];
}

const FILE_PATH = path.join(process.cwd(), "data/mission/decision-log.json");

function readAll(): DecisionLog[] {
  try {
    if (!fs.existsSync(FILE_PATH)) return [];
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? (parsed as DecisionLog[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: DecisionLog[]) {
  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(items, null, 2), "utf8");
}

async function fetchMacroSnapshot(): Promise<MacroSnapshot | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/macro-state`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();

    // Accept either {success,data} or a direct macro object.
    const candidate = json?.data ?? json;
    if (!candidate) return null;

    const regime = candidate.regime;
    const score = candidate.score;
    const confidence = candidate.confidence;
    const timestamp = candidate.timestamp;

    if (
      typeof regime !== "string" ||
      typeof score !== "number" ||
      typeof confidence !== "number" ||
      typeof timestamp !== "string"
    ) {
      return null;
    }

    return { regime, score, confidence, timestamp };
  } catch {
    return null;
  }
}

export async function GET() {
  const items = readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return Response.json({ success: true, data: items });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const payload = (typeof body === "object" && body !== null)
    ? (body as Record<string, unknown>)
    : {};

  const title = String(payload?.title ?? "").trim();
  const action = payload?.action as DecisionAction;
  const asset = String(payload?.asset ?? "").trim();
  const rationale = String(payload?.rationale ?? "").trim();
  const tags = Array.isArray(payload?.tags)
    ? (payload.tags as unknown[]).map((t) => String(t)).filter(Boolean)
    : undefined;

  const allowed: DecisionAction[] = ["加仓", "减仓", "观望", "对冲", "调仓"];
  if (!title || !allowed.includes(action) || !asset || !rationale) {
    return Response.json(
      { success: false, error: "Missing or invalid fields" },
      { status: 400 }
    );
  }

  const macroSnapshot = await fetchMacroSnapshot();

  const newItem: DecisionLog = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    title,
    action,
    asset,
    rationale,
    macroSnapshot,
    ...(tags && tags.length ? { tags } : {}),
  };

  const items = readAll();
  const next = [newItem, ...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  writeAll(next);

  return Response.json({ success: true, data: newItem });
}
