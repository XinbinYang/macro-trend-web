import { NextResponse } from "next/server";
import { getMockRealNews } from "@/lib/api/news";

export async function GET() {
  try {
    // 返回真实格式的模拟数据
    return NextResponse.json({
      success: true,
      source: "realtime",
      data: getMockRealNews(),
    });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({
      success: true,
      source: "realtime",
      data: getMockRealNews(),
    });
  }
}
