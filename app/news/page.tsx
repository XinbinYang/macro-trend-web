"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Calendar,
  Clock,
  TrendingUp,
  Flame
} from "lucide-react";

interface NewsItem {
  id: string;
  time: string;
  title: string;
  titleEn: string;
  content?: string;
  source: string;
  url?: string;
}

interface AIInsight {
  summary: string;
  impact: string;
  suggestion: string;
}

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  event: string;
  importance: 'high' | 'medium' | 'low';
  actual?: string;
  forecast?: string;
  previous?: string;
}

// AI 解读单条新闻 - 调用服务端API
async function analyzeNewsWithAI(news: NewsItem): Promise<AIInsight> {
  try {
    const response = await fetch('/api/ai-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: news.title,
        titleEn: news.titleEn,
        source: news.source
      }),
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data;
    }
    
    throw new Error('Invalid response');
  } catch (error) {
    console.error('AI analysis error:', error);
    // 返回本地生成的解读作为fallback
    return generateLocalInsight(news.titleEn);
  }
}

// 本地生成AI解读（不依赖API）
function generateLocalInsight(titleEn: string): AIInsight {
  const lowerTitle = titleEn.toLowerCase();
  
  let impact = '中性';
  let suggestion = '观望';
  let summary = '该新闻涉及市场重要动态，建议密切关注后续发展。';
  
  const positiveKeywords = ['rise', 'gain', 'surge', 'rally', 'growth', 'strong', 'boost', 'up', 'hike'];
  const negativeKeywords = ['fall', 'drop', 'decline', 'crash', 'weak', 'cut', 'down', 'loss', 'recession', 'concern'];
  
  if (positiveKeywords.some(k => lowerTitle.includes(k))) {
    impact = '正面';
    suggestion = '可考虑逢低布局';
  } else if (negativeKeywords.some(k => lowerTitle.includes(k))) {
    impact = '负面';
    suggestion = '建议减仓观望';
  }
  
  if (lowerTitle.includes('fed') || lowerTitle.includes('federal reserve') || lowerTitle.includes('rate')) {
    summary = '美联储政策动向对全球流动性产生重要影响，需关注利率路径指引。';
  } else if (lowerTitle.includes('cpi') || lowerTitle.includes('inflation')) {
    summary = '通胀数据直接影响央行政策预期，是近期市场关注焦点。';
  } else if (lowerTitle.includes('oil') || lowerTitle.includes('crude') || lowerTitle.includes('energy')) {
    summary = '能源价格波动影响通胀预期和全球经济增长前景。';
  } else if (lowerTitle.includes('china') || lowerTitle.includes('chinese')) {
    summary = '中国经济数据对全球供应链和大宗商品需求有重要指引作用。';
  } else if (lowerTitle.includes('earnings') || lowerTitle.includes('profit') || lowerTitle.includes('revenue')) {
    summary = '企业盈利状况反映经济基本面，影响市场风险偏好。';
  }
  
  return { summary, impact, suggestion };
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [insights, setInsights] = useState<Record<string, AIInsight>>({});
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      
      if (data.success && data.data.length > 0) {
        setNews(data.data);
        setLastUpdate(new Date());
        
        // 为每条新闻生成 AI 解读
        data.data.forEach((item: NewsItem) => {
          if (!insights[item.id]) {
            setAnalyzing(prev => ({ ...prev, [item.id]: true }));
            analyzeNewsWithAI(item).then(insight => {
              setInsights(prev => ({ ...prev, [item.id]: insight }));
              setAnalyzing(prev => ({ ...prev, [item.id]: false }));
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEconomicCalendar = async () => {
    setEventsLoading(true);
    try {
      const res = await fetch('/api/economic-calendar');
      const data = await res.json();
      
      if (data.success && data.data) {
        setEvents(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch economic calendar:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchEconomicCalendar();
    // 每5分钟刷新
    const interval = setInterval(() => {
      fetchNews();
      fetchEconomicCalendar();
    }, 300000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getImpactColor = (impact: string) => {
    if (impact.includes('正面') || impact.includes('positive')) return 'text-green-400 bg-green-500/10';
    if (impact.includes('负面') || impact.includes('negative')) return 'text-red-400 bg-red-500/10';
    return 'text-amber-400 bg-amber-500/10';
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getImportanceLabel = (importance: string) => {
    switch (importance) {
      case 'high': return '高';
      case 'medium': return '中';
      default: return '低';
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">
            实时资讯与AI解读
          </h1>
          <p className="text-sm text-slate-500">
            {lastUpdate.toLocaleString()} · 
            <Button variant="link" size="sm" onClick={() => { fetchNews(); fetchEconomicCalendar(); }} className="text-amber-400 p-0 h-auto">
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </p>
        </div>
        
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1.5"></span>
          实时更新
        </Badge>
      </div>

      <Tabs defaultValue="news" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900/50">
          <TabsTrigger value="news" className="data-[state=active]:bg-slate-800">
            <TrendingUp className="w-4 h-4 mr-2" />
            市场动态
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-slate-800">
            <Calendar className="w-4 h-4 mr-2" />
            财经日历
          </TabsTrigger>
        </TabsList>

        {/* 市场动态 Tab */}
        <TabsContent value="news" className="space-y-4 mt-4">
          <div className="space-y-4">
            {news.length > 0 ? (
              news.map((item) => {
                const insight = insights[item.id];
                const isAnalyzing = analyzing[item.id];
                
                return (
                  <Card key={item.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                    <CardContent className="p-4">
                      {/* 新闻标题 */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-slate-500">{item.time}</span>
                            <Badge variant="outline" className="text-[10px] text-slate-400">
                              {item.source}
                            </Badge>
                          </div>
                          <h3 className="text-base font-medium text-slate-100">{item.title}</h3>
                          <p className="text-sm text-slate-500 mt-1">{item.titleEn}</p>
                        </div>
                        {item.url && (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-amber-400 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {/* AI 解读 */}
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-amber-400">AI 解读</span>
                          {isAnalyzing && (
                            <span className="text-xs text-slate-500">分析中...</span>
                          )}
                        </div>
                        
                        {insight ? (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-300">{insight.summary}</p>
                            <div className="flex items-center gap-3">
                              <Badge className={`text-xs ${getImpactColor(insight.impact)}`}>
                                影响: {insight.impact}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                💡 {insight.suggestion}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">AI分析生成中...</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-500">
                {loading ? '加载中...' : '暂无资讯'}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 财经日历 Tab */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <div className="space-y-3">
            {eventsLoading ? (
              <div className="text-center py-12 text-slate-500">加载财经日历...</div>
            ) : events.length > 0 ? (
              events.map((event) => (
                <Card key={event.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`text-[10px] ${getImportanceColor(event.importance)}`}>
                            <Flame className="w-3 h-3 mr-1" />
                            重要性: {getImportanceLabel(event.importance)}
                          </Badge>
                          <span className="text-xs text-slate-500 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {event.date}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {event.time}
                          </span>
                        </div>
                        <h3 className="text-base font-medium text-slate-100">{event.event}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {event.country}
                          </Badge>
                          {event.forecast && (
                            <span className="text-xs text-slate-400">
                              预期: <span className="text-amber-400">{event.forecast}</span>
                            </span>
                          )}
                          {event.previous && (
                            <span className="text-xs text-slate-500">
                              前值: {event.previous}
                            </span>
                          )}
                          {event.actual && (
                            <span className="text-xs text-green-400">
                              公布: {event.actual}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500">暂无财经事件</div>
            )}
          </div>
          
          {/* 财经日历说明 */}
          <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <p className="text-sm text-slate-300">
                  财经日历展示本周重要经济数据和央行事件。高重要性事件可能引发市场波动，请密切关注。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 底部提示 */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <p className="text-sm text-slate-300">
              AI解读仅供参考，不构成投资建议。请结合个人判断做出投资决策。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}