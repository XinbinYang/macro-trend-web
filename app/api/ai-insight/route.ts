import { NextResponse } from "next/server";
import { llmChat } from "@/lib/api/llm";

interface AIInsight {
  summary: string;
  impact: string;
  suggestion: string;
}

// AI 解读单条新闻 - 服务端API
export async function POST(request: Request) {
  try {
    const { titleEn, source } = await request.json();
    
    if (!titleEn) {
      return NextResponse.json({
        success: false,
        error: 'Missing titleEn parameter'
      }, { status: 400 });
    }

    const payload = {
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            '你是专业的宏观投资分析师。请分析以下财经新闻，提供：1）一句话总结；2）对市场的影响（正面/负面/中性）；3）投资建议。用JSON格式返回：{"summary": "", "impact": "", "suggestion": ""}',
        },
        {
          role: "user",
          content: `新闻标题：${titleEn}\n来源：${source || "Unknown"}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    };

    const result = await llmChat(payload);
    if (!result.ok) {
      console.error("LLM error (ai-insight):", result.provider, result.status, result.error);
      return NextResponse.json(
        { success: false, error: `${result.provider}: ${result.error || "LLM error"}` },
        { status: 502 }
      );
    }

    const content = result.text || "";

    // 尝试解析 JSON
    let insight: AIInsight;
    try {
      const parsed = JSON.parse(content);
      insight = {
        summary: parsed.summary || '暂无解读',
        impact: parsed.impact || '中性',
        suggestion: parsed.suggestion || '观望',
      };
    } catch {
      // 如果不是 JSON，直接返回文本解析
      insight = {
        summary: content?.slice(0, 100) || 'AI分析完成',
        impact: '中性',
        suggestion: '关注后续发展',
      };
    }

    return NextResponse.json({
      success: true,
      data: insight,
      source: result.provider,
      usage: result.usage
    });
    
  } catch (error) {
    console.error('AI insight API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

// NOTE: 按产品规则「必须真 AI」，不提供 mock/fallback 生成功能。
// 如需本地兜底，请显式开启 feature flag（当前未启用）。