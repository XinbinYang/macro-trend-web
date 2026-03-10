import { NextResponse } from "next/server";
import { getRealFinanceNews } from "@/lib/api/news";

export async function GET() {
  // 直接返回真实格式数据（不依赖外部API）
  return NextResponse.json({
    success: true,
    source: "market",
    data: getRealFinanceNews(),
  });
}
