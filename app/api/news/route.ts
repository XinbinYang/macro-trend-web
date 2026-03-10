import { NextResponse } from "next/server";
import { getBraveFinanceNews } from "@/lib/api/news";

export async function GET() {
  try {
    // 使用 Brave Search API 获取新闻
    const news = await getBraveFinanceNews();
    
    return NextResponse.json({
      success: true,
      source: "brave",
      data: news,
    });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
