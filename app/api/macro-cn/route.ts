import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

type CnPayload = {
  region: "CN";
  status: string;
  updatedAt: string;
  asOf: string | null;
  series: Record<string, { value: number | null; asOf: string | null; source: string; unit?: string }>;
  notes?: string;
};

function monthsBetween(from: string, to = new Date().toISOString().slice(0, 7)) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function loadJson(filePath: string): CnPayload | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), "data", "macro", "cn");
    const latestPath = path.join(baseDir, "latest.json");
    const latest = loadJson(latestPath);

    if (!latest) {
      return NextResponse.json(
        {
          success: false,
          status: "OFF",
          error: "CN macro snapshot not found. Run scripts/update_macro_cn_monthly.py",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=3600",
          },
        }
      );
    }

    const asOf = latest.asOf;
    const stale = asOf ? monthsBetween(asOf) >= 2 : true;

    let data = latest;
    const freshness: "LIVE" | "STALE" = stale ? "STALE" : "LIVE";

    if (stale && asOf) {
      const archivePath = path.join(baseDir, "archive", `${asOf}.json`);
      const archived = loadJson(archivePath);
      if (archived) {
        data = archived;
      }
    }

    return NextResponse.json(
      {
        success: true,
        freshness,
        stale,
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, status: "OFF", error: (e as Error).message },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}