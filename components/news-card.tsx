"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle
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

interface AIInsight {
  summary: string;
  impact: string;
  suggestion: string;
}

interface NewsCardProps {
  item: NewsItem;
  insight?: AIInsight;
  isAnalyzing?: boolean;
  showBucket?: boolean;
}

export function NewsCard({ item, insight, isAnalyzing, showBucket = false }: NewsCardProps) {

  const getImpactColor = (impact: string) => {
    if (impact.includes('正面') || impact.includes('positive')) return 'text-green-400 bg-green-500/10';
    if (impact.includes('负面') || impact.includes('negative')) return 'text-red-400 bg-red-500/10';
    return 'text-amber-400 bg-amber-500/10';
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-4">
        {/* 新闻标题 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-slate-500">{item.time}</span>
              <Badge variant="outline" className="text-[10px] text-slate-400">
                {item.source}
              </Badge>
              {showBucket && item.queryBucket && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                  {item.queryBucket}
                </Badge>
              )}
              {item.isImportant && (
                <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  重要
                </Badge>
              )}
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
}

interface NewsSectionProps {
  title: string;
  items: NewsItem[];
  insights: Record<string, AIInsight>;
  analyzing: Record<string, boolean>;
  onAnalyze: (item: NewsItem) => void;
  defaultExpanded?: boolean;
  showBucket?: boolean;
  emptyMessage?: string;
}

export function NewsSection({ 
  title, 
  items, 
  insights, 
  analyzing, 
  onAnalyze,
  defaultExpanded = true,
  showBucket = false,
  emptyMessage = "暂无资讯"
}: NewsSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // 自动触发分析（当 items 更新时）
  useEffect(() => {
    items.forEach((item) => {
      if (!insights[item.id]) {
        onAnalyze(item);
      }
    });
  }, [items, insights, onAnalyze]);

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          {title}
          <Badge variant="outline" className="text-xs text-slate-400">
            {items.length}
          </Badge>
        </h2>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Section Content */}
      {expanded && (
        <div className="space-y-3">
          {items.length > 0 ? (
            items.map((item) => {
              const insight = insights[item.id];
              const isAnalyzing = analyzing[item.id];
              
              return (
                <NewsCard
                  key={item.id}
                  item={item}
                  insight={insight}
                  isAnalyzing={isAnalyzing}
                  showBucket={showBucket}
                />
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-500">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SourceBadgeProps {
  source: string;
  fetchedAt?: string;
}

export function SourceBadge({ source, fetchedAt }: SourceBadgeProps) {
  const getSourceStyle = (src: string) => {
    const s = src.toLowerCase();
    if (s === 'brave') {
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    }
    if (s === 'fallback' || s === 'brave-error') {
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const getSourceLabel = (src: string) => {
    const s = src.toLowerCase();
    if (s === 'brave') return 'INDEX';
    if (s === 'fallback') return 'FALLBACK';
    if (s === 'brave-error') return 'INDEX (ERROR)';
    return src.toUpperCase();
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={`text-xs ${getSourceStyle(source)}`}>
        {getSourceLabel(source)}
      </Badge>
      {fetchedAt && (
        <span className="text-xs text-slate-500">
          {new Date(fetchedAt).toLocaleString('zh-CN')}
        </span>
      )}
    </div>
  );
}
