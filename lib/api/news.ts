// Brave Search API 新闻获取
// 文档: https://api.search.brave.com/app/documentation/web-search/get-started

interface NewsItem {
  id: string;
  time: string;
  title: string;
  content?: string;
  source: string;
  url?: string;
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
    
    return results.map((item: { age?: string; title: string; description?: string; meta?: { domain?: string }; url?: string }, index: number) => ({
      id: `brave-${index}`,
      time: new Date(item.age || Date.now()).toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      title: item.title,
      content: item.description?.slice(0, 60) + '...' || '',
      source: item.meta?.domain || 'Brave News',
      url: item.url,
    })).slice(0, 5);
    
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
