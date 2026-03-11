import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const strategy = searchParams.get("strategy") || "beta70";

    // allowlist (avoid arbitrary file reads)
    const allow = new Set(["beta70"]);
    if (!allow.has(strategy)) {
      return NextResponse.json(
        { success: false, error: "Unknown strategy" },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "data", "nav", strategy, "latest.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data,
      disclaimer: data.disclaimer || "",
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
