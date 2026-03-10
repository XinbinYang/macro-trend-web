// 财经新闻 API 封装

interface NewsItem {
  id: string;
  time: string;
  title: string;
  content?: string;
  source: string;
}

// 使用真实格式数据
export function getMockRealNews(): NewsItem[] {
  return [
    {
      id: '1',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '美联储3月利率决议将于周四凌晨公布',
      content: '市场普遍预期维持利率不变，关注鲍威尔讲话',
      source: '财联社',
    },
    {
      id: '2',
      time: new Date(Date.now() - 30 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '美国2月CPI同比增长3.2%，略高于预期',
      content: '核心CPI同比增长3.8%，通胀粘性仍存',
      source: '新浪财经',
    },
    {
      id: '3',
      time: new Date(Date.now() - 60 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '欧洲央行维持三大关键利率不变',
      content: '拉加德表示需要更多数据确认通胀回落',
      source: '彭博社',
    },
    {
      id: '4',
      time: new Date(Date.now() - 90 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: 'WTI原油突破85美元，创近期新高',
      content: '地缘紧张局势加剧供应担忧',
      source: '路透社',
    },
    {
      id: '5',
      time: new Date(Date.now() - 120 * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      title: '日本央行或于3月结束负利率政策',
      content: '日元兑美元短线走强',
      source: '日经新闻',
    },
  ];
}
