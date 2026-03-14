// DEAD_CODE: deprecated, do not call
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "macro", "regime-history.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ success: true, data }, { status: 200, headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 200 });
  }
}