// Brave Search API 新闻获取 + 重要新闻过滤
// 文档: https://api.search.brave.com/app/documentation/web-search/get-started

interface NewsItem {
  id: string;
  time: string;
  title: string;
  titleEn?: string;
  content?: string;
  source: string;
  url?: string;
  score?: number;
  isImportant?: boolean;
  queryBucket?: string;
}

// 重要新闻关键词 (用于评分)
const IMPORTANT_KEYWORDS = [
  'fed', 'federal reserve', 'interest rate', 'fomc', 'powell',
  'cpi', 'inflation', 'pce', 'gdp', 'unemployment',
  'recession', 'crisis', 'default', 'bankruptcy',
  'tariff', 'trade war', 'sanction', 'geopolitical',
  'earnings', 'guidance', 'outlook',
  'central bank', 'ecb', 'boe', 'boj',
  'market crash', 'plunge', 'surge', 'rally',
  'breaking', 'urgent', 'alert'
];

// 高权重新闻源
const HIGH_WEIGHT_SOURCES = [
  'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com',
  'cnbc.com', 'marketwatch.com', 'finance.yahoo.com',
  'gov.cn', 'xinhuanet.com', 'cn.reuters.com'
];

// 搜索主题桶 (分主题查询以覆盖不同领域)
const QUERY_BUCKETS = [
  { name: 'fed_policy', query: 'federal reserve interest rate policy 2025', label: '美联储政策' },
  { name: 'inflation', query: 'CPI inflation economic data', label: '通胀数据' },
  { name: 'equity', query: 'stock market earnings S&P 500 Nasdaq', label: '股市动态' },
  { name: 'commodity', query: 'oil crude gold commodity price', label: '大宗商品' },
  { name: 'china', query: 'China economy GDP stimulus', label: '中国经济' },
  { name: 'europe', query: 'ECB Europe economy rate', label: '欧洲市场' },
  { name: 'breaking', query: 'breaking news market alert', label: '突发新闻' },
];

// AI 翻译已关闭：直接返回原标题，避免持续消耗 OpenRouter token。
async function translateWithAI(text: string): Promise<string> {
  return text;
}

// 计算新闻重要性评分
function calculateScore(item: { title: string; description?: string; meta?: { domain?: string } }): number {
  let score = 0;
  const titleLower = (item.title + ' ' + (item.description || '')).toLowerCase();
  const source = item.meta?.domain?.toLowerCase() || '';

  // 关键词匹配评分
  for (const kw of IMPORTANT_KEYWORDS) {
    if (titleLower.includes(kw)) {
      score += kw.length > 10 ? 3 : 2; // 更长的关键词权重更高
    }
  }

  // 来源权重
  for (const src of HIGH_WEIGHT_SOURCES) {
    if (source.includes(src)) {
      score += 3;
      break;
    }
  }

  // 时间因子 (越新分数越高 - 但这在获取时已经按时间排序了)
  
  return score;
}

// 简单去重 (基于URL或标题相似度)
function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const result: NewsItem[] = [];

  for (const item of items) {
    const urlKey = item.url || '';
    const titleKey = item.titleEn?.toLowerCase().slice(0, 50) || '';
    
    // 跳过完全相同的URL
    if (urlKey && seen.has(urlKey)) continue;
    
    // 跳过标题相似的
    if (titleKey && seen.has(titleKey)) continue;

    seen.add(urlKey || titleKey);
    result.push(item);
  }

  return result;
}

// 使用 Brave Search API 获取分桶财经新闻
export async function getBraveFinanceNews(): Promise<{
  topImportant: NewsItem[];
  more: NewsItem[];
  fetchedAt: string;
  source: string;
}> {
  const apiKey = process.env.BRAVE_API_KEY;
  const fetchedAt = new Date().toISOString();

  if (!apiKey) {
    console.log('BRAVE_API_KEY not configured, using fallback data');
    const fallback = getFallbackNews();
    return {
      topImportant: fallback.slice(0, 3),
      more: fallback.slice(3),
      fetchedAt,
      source: 'fallback',
    };
  }

  try {
    // 并行执行所有桶的查询
    const bucketPromises = QUERY_BUCKETS.map(async (bucket) => {
      try {
        const response = await fetch(
          `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(bucket.query)}&count=5&freshness=day`,
          {
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': apiKey,
            },
            next: { revalidate: 300 },
          }
        );

        if (!response.ok) return [];

        const data = await response.json();
        const results = data.results || [];

        return results.map((item: { age?: string; title: string; description?: string; meta?: { domain?: string }; url?: string }) => ({
          ...item,
          _bucket: bucket.name,
          _bucketLabel: bucket.label,
          _score: calculateScore(item),
        }));
      } catch (error) {
        console.error(`Brave API error for bucket ${bucket.name}:`, error);
        return [];
      }
    });

    const allBucketResults = await Promise.all(bucketPromises);
    let allNews: (ReturnType<typeof allBucketResults[0]>[0] & { _bucket: string; _bucketLabel: string; _score: number })[] = [];

    // 合并所有桶的结果
    for (const bucketResult of allBucketResults) {
      allNews = allNews.concat(bucketResult);
    }

    // 按分数排序
    allNews.sort((a, b) => b._score - a._score);

    // 翻译所有标题 (并行)
    const translatedTitles = await Promise.all(
      allNews.map((item) => translateWithAI(item.title))
    );

    // 转换为 NewsItem 格式
    const newsItems: NewsItem[] = allNews.map((item, index) => {
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
        id: `brave-${index}-${Date.now()}`,
        time: timeStr,
        title: translatedTitles[index],
        titleEn: item.title,
        content: item.description?.slice(0, 80) + '...' || '',
        source: item.meta?.domain || 'Brave',
        url: item.url,
        score: item._score,
        queryBucket: item._bucketLabel,
        isImportant: item._score >= 5, // 分数 >= 5 视为重要
      };
    });

    // 去重
    const dedupedNews = deduplicateNews(newsItems);

    // 分离重要新闻和其他
    const important = dedupedNews.filter(n => n.isImportant).slice(0, 5);
    const more = dedupedNews.filter(n => !n.isImportant).slice(0, 10);

    return {
      topImportant: important,
      more,
      fetchedAt,
      source: 'brave',
    };

  } catch (error) {
    console.error('Brave API error:', error);
    const fallback = getFallbackNews();
    return {
      topImportant: fallback.slice(0, 3),
      more: fallback.slice(3),
      fetchedAt,
      source: 'brave-error',
    };
  }
}

// 备用数据
function getFallbackNews(): NewsItem[] {
  const now = new Date();
  
  return [
    {
      id: '1',
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '美联储3月利率决议将于周四凌晨2:00公布',
      content: '市场预期维持5.25%-5.50%利率不变，关注鲍威尔讲话',
      source: 'FOMC',
      score: 10,
      isImportant: true,
    },
    {
      id: '2',
      time: new Date(now.getTime() - 30 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '美国2月CPI同比增长3.2%，高于预期的3.1%',
      content: '核心CPI同比3.8%，通胀粘性超预期',
      source: 'U.S. BLS',
      score: 10,
      isImportant: true,
    },
    {
      id: '3',
      time: new Date(now.getTime() - 60 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '欧洲央行维持三大关键利率不变',
      content: '拉加德：需要更多数据确认通胀回落',
      source: 'ECB',
      score: 6,
      isImportant: true,
    },
    {
      id: '4',
      time: new Date(now.getTime() - 90 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: 'WTI原油突破85美元/桶，创4个月新高',
      content: 'OPEC+减产延长、地缘紧张加剧供应担忧',
      source: 'NYMEX',
      score: 5,
      isImportant: false,
    },
    {
      id: '5',
      time: new Date(now.getTime() - 120 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '日本央行或于3月19日结束负利率政策',
      content: '日元兑美元短线升破147',
      source: 'BOJ',
      score: 7,
      isImportant: true,
    },
  ];
}
