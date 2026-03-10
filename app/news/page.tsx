"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ExternalLink
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

// AI 解读单条新闻
async function analyzeNewsWithAI(news: NewsItem): Promise<AIInsight> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_KEY || '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'}`,
        'Content-Type': 'application/json',
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
            content: `新闻标题：${news.titleEn}\n来源：${news.source}`
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // 尝试解析 JSON
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || '暂无解读',
        impact: parsed.impact || '中性',
        suggestion: parsed.suggestion || '观望',
      };
    } catch {
      // 如果不是 JSON，直接返回文本
      return {
        summary: content?.slice(0, 100) || 'AI分析中...',
        impact: '分析中',
        suggestion: '请稍后刷新',
      };
    }
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      summary: 'AI解读服务暂时不可用',
      impact: '未知',
      suggestion: '请稍后重试',
    };
  }
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [insights, setInsights] = useState<Record<string, AIInsight>>({});
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchNews();
    // 每5分钟刷新
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getImpactColor = (impact: string) => {
    if (impact.includes('正面') || impact.includes('positive')) return 'text-green-400 bg-green-500/10';
    if (impact.includes('负面') || impact.includes('negative')) return 'text-red-400 bg-red-500/10';
    return 'text-amber-400 bg-amber-500/10';
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
            <Button variant="link" size="sm" onClick={fetchNews} className="text-amber-400 p-0 h-auto">
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </p>
        </div>
        
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1.5"></span>
          Brave实时
        </Badge>
      </div>

      {/* 资讯列表 */}
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
