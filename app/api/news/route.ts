import { NextResponse } from "next/server";
import { getBraveFinanceNews } from "@/lib/api/news";

export async function GET() {
  try {
    // 使用 Brave Search API 获取分桶新闻 + 重要新闻过滤
    const result = await getBraveFinanceNews();
    
    return NextResponse.json({
      success: true,
      source: result.source,
      fetchedAt: result.fetchedAt,
      data: {
        topImportant: result.topImportant,
        more: result.more,
      },
    });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
