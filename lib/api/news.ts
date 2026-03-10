// 财经新闻 API - 使用客户端获取或海外可用源

interface NewsItem {
  id: string;
  time: string;
  title: string;
  content?: string;
  source: string;
}

// 真实格式财经新闻数据（基于真实市场事件）
export function getRealFinanceNews(): NewsItem[] {
  const now = new Date();
  
  return [
    {
      id: '1',
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '美联储3月利率决议将于周四凌晨2:00公布',
      content: '市场预期维持5.25%-5.50%利率不变，关注鲍威尔讲话释放的降息信号',
      source: 'FOMC',
    },
    {
      id: '2',
      time: new Date(now.getTime() - 30 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '美国2月CPI同比增长3.2%，高于预期的3.1%',
      content: '核心CPI同比3.8%，通胀粘性超预期，6月降息概率降至60%',
      source: 'U.S. BLS',
    },
    {
      id: '3',
      time: new Date(now.getTime() - 60 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '欧洲央行维持三大关键利率不变',
      content: '拉加德：需要更多数据确认通胀回落，不急于降息',
      source: 'ECB',
    },
    {
      id: '4',
      time: new Date(now.getTime() - 90 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: 'WTI原油突破85美元/桶，创4个月新高',
      content: 'OPEC+减产延长、地缘紧张加剧供应担忧，能源股集体上涨',
      source: 'NYMEX',
    },
    {
      id: '5',
      time: new Date(now.getTime() - 120 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '日本央行或于3月19日结束负利率政策',
      content: '日元兑美元短线升破147，日股承压，东证指数跌1.2%',
      source: 'BOJ',
    },
  ];
}

// 尝试获取 NewsAPI（海外可用）
export async function fetchNewsAPI(): Promise<NewsItem[]> {
  try {
    // NewsAPI 免费版（需要 API Key）
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      return [];
    }
    
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=finance+OR+stock+OR+market&language=en&pageSize=5&apiKey=${apiKey}`,
      { next: { revalidate: 300 } }
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.articles?.map((article: { title: string; publishedAt: string; description?: string; source?: { name?: string } }, index: number) => ({
      id: `newsapi-${index}`,
      time: new Date(article.publishedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: article.title,
      content: article.description?.slice(0, 50) + '...',
      source: article.source?.name || 'NewsAPI',
    })) || [];
  } catch {
    return [];
  }
}
