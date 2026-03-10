// Brave Search API 新闻获取 + AI 翻译
// 文档: https://api.search.brave.com/app/documentation/web-search/get-started

interface NewsItem {
  id: string;
  time: string;
  title: string;
  titleEn?: string; // 英文原标题
  content?: string;
  source: string;
  url?: string;
}

// AI 翻译函数
async function translateWithAI(text: string): Promise<string> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // 使用便宜快速的模型
        messages: [
          {
            role: 'system',
            content: '你是一个专业的财经新闻翻译助手。将英文财经新闻标题翻译成简洁的中文，保持专业术语准确。只返回翻译结果，不要解释。'
          },
          {
            role: 'user',
            content: `翻译以下财经新闻标题为中文：\n\n${text}`
          }
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error('Translation API error');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // 失败时返回原文
  }
}

// 使用 Brave Search API 获取财经新闻
export async function getBraveFinanceNews(): Promise<NewsItem[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  
  if (!apiKey) {
    console.log('BRAVE_API_KEY not configured, using fallback data');
    return getFallbackNews();
  }
  
  try {
    const response = await fetch(
      'https://api.search.brave.com/res/v1/news/search?q=finance+stock+market+federal+reserve&count=5&freshness=day',
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
        next: { revalidate: 300 }, // 5分钟缓存
      }
    );

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];
    
    // 并行翻译所有标题
    const translatedTitles = await Promise.all(
      results.map((item: { title: string }) => translateWithAI(item.title))
    );
    
    return results.map((item: { age?: string; title: string; description?: string; meta?: { domain?: string }; url?: string }, index: number) => {
      // 处理时间格式
      let timeStr = '刚刚';
      if (item.age) {
        const match = item.age.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2];
          const now = new Date();
          if (unit === 'minute') {
            timeStr = new Date(now.getTime() - num * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          } else if (unit === 'hour') {
            timeStr = new Date(now.getTime() - num * 3600000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          } else {
            timeStr = item.age;
          }
        }
      }
      
      return {
        id: `brave-${index}`,
        time: timeStr,
        title: translatedTitles[index],
        titleEn: item.title,
        content: item.description?.slice(0, 60) + '...' || '',
        source: item.meta?.domain || 'Brave News',
        url: item.url,
      };
    }).slice(0, 5);
    
  } catch (error) {
    console.error('Brave API error:', error);
    // 返回错误信息作为内容，方便调试
    return [{
      id: 'error',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: 'Brave API 错误: ' + (error as Error).message,
      content: '使用备用数据',
      source: 'Debug',
    }, ...getFallbackNews()];
  }
}

// 备用数据（真实市场事件）
function getFallbackNews(): NewsItem[] {
  const now = new Date();
  
  return [
    {
      id: '1',
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '美联储3月利率决议将于周四凌晨2:00公布',
      content: '市场预期维持5.25%-5.50%利率不变，关注鲍威尔讲话',
      source: 'FOMC',
    },
    {
      id: '2',
      time: new Date(now.getTime() - 30 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '美国2月CPI同比增长3.2%，高于预期的3.1%',
      content: '核心CPI同比3.8%，通胀粘性超预期',
      source: 'U.S. BLS',
    },
    {
      id: '3',
      time: new Date(now.getTime() - 60 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '欧洲央行维持三大关键利率不变',
      content: '拉加德：需要更多数据确认通胀回落',
      source: 'ECB',
    },
    {
      id: '4',
      time: new Date(now.getTime() - 90 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: 'WTI原油突破85美元/桶，创4个月新高',
      content: 'OPEC+减产延长、地缘紧张加剧供应担忧',
      source: 'NYMEX',
    },
    {
      id: '5',
      time: new Date(now.getTime() - 120 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '日本央行或于3月19日结束负利率政策',
      content: '日元兑美元短线升破147',
      source: 'BOJ',
    },
  ];
}
