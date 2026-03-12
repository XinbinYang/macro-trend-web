"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
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

interface NewsCardProps {
  item: NewsItem;
  showBucket?: boolean;
}

export function NewsCard({ item, showBucket = false }: NewsCardProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-4">
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
      </CardContent>
    </Card>
  );
}

interface NewsSectionProps {
  title: string;
  items: NewsItem[];
  defaultExpanded?: boolean;
  showBucket?: boolean;
  emptyMessage?: string;
}

export function NewsSection({ 
  title, 
  items, 
  defaultExpanded = true,
  showBucket = false,
  emptyMessage = "暂无资讯"
}: NewsSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-3">
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

      {expanded && (
        <div className="space-y-3">
          {items.length > 0 ? (
            items.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                showBucket={showBucket}
              />
            ))
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