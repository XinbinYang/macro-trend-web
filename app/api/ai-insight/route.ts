import { NextResponse } from "next/server";

interface AIInsight {
  summary: string;
  impact: string;
  suggestion: string;
}

// AI 解读单条新闻 - 服务端API
export async function POST(request: Request) {
  try {
    const { title, titleEn, source } = await request.json();
    
    if (!titleEn) {
      return NextResponse.json({
        success: false,
        error: 'Missing titleEn parameter'
      }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      // 如果没有API密钥，返回模拟的AI解读
      return NextResponse.json({
        success: true,
        data: generateMockInsight(titleEn),
        source: 'mock'
      });
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
      // 返回模拟数据作为fallback
      return NextResponse.json({
        success: true,
        data: generateMockInsight(titleEn),
        source: 'fallback'
      });
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

// 生成模拟AI解读（作为fallback）
function generateMockInsight(titleEn: string): AIInsight {
  const lowerTitle = titleEn.toLowerCase();
  
  // 根据关键词判断影响方向
  let impact = '中性';
  let suggestion = '观望';
  
  const positiveKeywords = ['rise', 'gain', 'surge', 'rally', 'growth', 'strong', 'boost', 'up'];
  const negativeKeywords = ['fall', 'drop', 'decline', 'crash', 'weak', 'cut', 'down', 'loss', 'recession'];
  
  if (positiveKeywords.some(k => lowerTitle.includes(k))) {
    impact = '正面';
    suggestion = '可考虑逢低布局';
  } else if (negativeKeywords.some(k => lowerTitle.includes(k))) {
    impact = '负面';
    suggestion = '建议减仓观望';
  }
  
  // 生成一句话总结
  let summary = '该新闻涉及市场重要动态，建议密切关注后续发展。';
  
  if (lowerTitle.includes('fed') || lowerTitle.includes('federal reserve') || lowerTitle.includes('rate')) {
    summary = '美联储政策动向对全球流动性产生重要影响，需关注利率路径指引。';
  } else if (lowerTitle.includes('cpi') || lowerTitle.includes('inflation')) {
    summary = '通胀数据直接影响央行政策预期，是近期市场关注焦点。';
  } else if (lowerTitle.includes('oil') || lowerTitle.includes('crude') || lowerTitle.includes('energy')) {
    summary = '能源价格波动影响通胀预期和全球经济增长前景。';
  } else if (lowerTitle.includes('china') || lowerTitle.includes('chinese')) {
    summary = '中国经济数据对全球供应链和大宗商品需求有重要指引作用。';
  }
  
  return { summary, impact, suggestion };
}