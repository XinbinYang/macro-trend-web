import { NextResponse } from "next/server";

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

    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      // 没有 API Key：按产品要求「必须真 AI」→ 直接报错，不做 mock/fallback
      return NextResponse.json({
        success: false,
        error: 'OPENROUTER_API_KEY is not configured'
      }, { status: 503 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL || 'https://macro-trend-web.vercel.app',
        'X-Title': 'AI宏观作手'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是专业的宏观投资分析师。请分析以下财经新闻，提供：1）一句话总结；2）对市场的影响（正面/负面/中性）；3）投资建议。用JSON格式返回：{"summary": "", "impact": "", "suggestion": ""}'
          },
          {
            role: 'user',
            content: `新闻标题：${titleEn}\n来源：${source || 'Unknown'}`
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `OpenRouter API error: ${response.status}`
      }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
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
      source: 'openrouter'
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