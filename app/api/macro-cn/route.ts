import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "macro", "cn", "latest.json");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          success: false,
          status: "OFF",
          error: "CN macro snapshot not found. Run scripts/update_macro_cn_monthly.py",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=86400", // 1 day (monthly data)
          },
        }
      );
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=86400", // 1 day (monthly data)
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
