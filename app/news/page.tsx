"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewsSection, SourceBadge } from "@/components/news-card";
import { 
  AlertTriangle,
  RefreshCw,
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
  score?: number;
  isImportant?: boolean;
  queryBucket?: string;
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

export default function NewsPage() {
  const [topImportant, setTopImportant] = useState<NewsItem[]>([]);
  const [moreNews, setMoreNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [source, setSource] = useState<string>('brave');
  const [fetchedAt, setFetchedAt] = useState<string>('');

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      
      if (data.success) {
        setTopImportant(data.data.topImportant || []);
        setMoreNews(data.data.more || []);
        setSource(data.source || 'brave');
        setFetchedAt(data.fetchedAt || '');
        setLastUpdate(new Date());
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
    const interval = setInterval(() => {
      fetchNews();
      fetchEconomicCalendar();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">
            实时资讯
          </h1>
          <p className="text-sm text-slate-500">
            {lastUpdate.toLocaleString()} · 
            <Button variant="link" size="sm" onClick={() => { fetchNews(); fetchEconomicCalendar(); }} className="text-amber-400 p-0 h-auto">
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </p>
        </div>
        
        <SourceBadge source={source} fetchedAt={fetchedAt} />
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

        <TabsContent value="news" className="space-y-6 mt-4">
          <NewsSection
            title="重要新闻"
            items={topImportant}
            defaultExpanded={true}
            showBucket={true}
            emptyMessage="暂无重要新闻"
          />

          <NewsSection
            title="更多新闻"
            items={moreNews}
            defaultExpanded={false}
            showBucket={true}
            emptyMessage="暂无更多新闻"
          />
        </TabsContent>

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

      <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <p className="text-sm text-slate-300">
              资讯仅供参考，不构成投资建议。请结合个人判断做出投资决策。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}