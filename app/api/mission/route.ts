import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function getRecentCommits() {
  try {
    const out = execSync('git log --oneline -5', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha, ...rest] = line.trim().split(" ");
        return { sha, message: rest.join(" ") };
      });
  } catch {
    return [] as Array<{ sha: string; message: string }>;
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "mission", "status.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...data,
          devFeed: {
            commits: getRecentCommits(),
          },
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 200 }
    );
  }
}