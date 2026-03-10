"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  TrendingUp, 
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw
} from "lucide-react";

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface Signal {
  id: string;
  type: 'warning' | 'opportunity' | 'info';
  title: string;
  description: string;
  suggestion: string;
  metric: string;
  value: string;
}

// 基于真实市场数据计算信号
function calculateSignals(marketData: MarketData[]): Signal[] {
  const signals: Signal[] = [];
  
  // 获取主要指数
  const vix = marketData.find(m => m.symbol === 'VIX');
  const gold = marketData.find(m => m.symbol === 'GLD');
  const tlt = marketData.find(m => m.symbol === 'TLT');
  
  // VIX 信号
  if (vix && vix.price > 20) {
    signals.push({
      id: 'vix',
      type: 'warning',
      title: '美股波动率上升',
      description: `VIX指数突破20，当前${vix.price.toFixed(2)}，市场不确定性增加`,
      suggestion: '考虑降低仓位或购买保护性期权',
      metric: 'VIX',
      value: vix.price.toFixed(2),
    });
  }
  
  // 黄金信号
  if (gold && gold.price > 2100) {
    signals.push({
      id: 'gold',
      type: 'opportunity',
      title: '黄金突破关键技术位',
      description: `金价突破$2100，当前$${gold.price.toFixed(2)}，创历史新高`,
      suggestion: '趋势跟踪，关注回调买入机会',
      metric: 'GOLD',
      value: `$${gold.price.toFixed(2)}`,
    });
  }
  
  // 美债信号
  if (tlt && tlt.changePercent < -1) {
    signals.push({
      id: 'bond',
      type: 'info',
      title: '美债收益率快速上行',
      description: `TLT下跌${tlt.changePercent.toFixed(2)}%，收益率承压`,
      suggestion: '关注经济衰退风险，增配防御性资产',
      metric: 'TLT',
      value: `${tlt.changePercent.toFixed(2)}%`,
    });
  }
  
  return signals;
}

// AI 分析生成
function generateAIAnalysis(marketData: MarketData[]): string {
  const spy = marketData.find(m => m.symbol === 'SPY');
  const qqq = marketData.find(m => m.symbol === 'QQQ');
  
  let analysis = '基于最新市场数据：';
  
  if (spy && spy.changePercent > 0) {
    analysis += `美股大盘上涨${spy.changePercent.toFixed(2)}%，`;
  } else if (spy) {
    analysis += `美股大盘下跌${Math.abs(spy.changePercent).toFixed(2)}%，`;
  }
  
  if (qqq && spy && qqq.changePercent > spy.changePercent) {
    analysis += '科技股表现强于大盘，';
  }
  
  analysis += '建议关注：1）美联储政策动向；2）通胀数据变化；3）地缘政治风险。';
  
  return analysis;
}

export default function NewsPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取实时市场数据
      const res = await fetch('/api/market-data-realtime');
      const data = await res.json();
      
      if (data.success) {
        const allData = [...data.indices, ...data.assets];
        setMarketData(allData);
        
        // 计算信号
        const calculatedSignals = calculateSignals(allData);
        setSignals(calculatedSignals);
        
        // 生成 AI 分析
        const analysis = generateAIAnalysis(allData);
        setAiAnalysis(analysis);
        
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 每30秒刷新
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-l-red-500 bg-red-500/5';
      case 'opportunity': return 'border-l-green-500 bg-green-500/5';
      default: return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'opportunity': return <TrendingUp className="w-5 h-5 text-green-400" />;
      default: return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">
            实时资讯与AI分析
          </h1>
          <p className="text-sm text-slate-500">
            {lastUpdate.toLocaleString()} · 
            <Button variant="link" size="sm" onClick={fetchData} className="text-amber-400 p-0 h-auto">
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </p>
        </div>
        
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1.5"></span>
          实时连接
        </Badge>
      </div>

      {/* 实时信号 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {signals.length > 0 ? (
          signals.map((signal) => (
            <Card 
              key={signal.id} 
              className={`border-l-4 ${getTypeColor(signal.type)} bg-slate-900/50 border-slate-800`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getTypeIcon(signal.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-100 text-sm">{signal.title}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {signal.metric}: {signal.value}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">{signal.description}</p>
                    <p className="text-xs text-amber-400 mt-2">💡 {signal.suggestion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-3 text-center py-8 text-slate-500">
            暂无实时信号，市场处于正常波动范围
          </div>
        )}
      </div>

      {/* AI 市场解读 */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-400">
            <Sparkles className="w-4 h-4" />
            AI 实时市场解读
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-400">AI分析生成中...</div>
          ) : (
            <>
              <p className="text-sm text-slate-300 leading-relaxed">
                {aiAnalysis}
              </p>
              <Button variant="link" className="text-amber-400 p-0 h-auto mt-2 text-sm">
                查看完整分析报告 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* 市场动态 */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-100">实时行情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {marketData.slice(0, 8).map((item) => (
              <div key={item.symbol} className="p-3 bg-slate-800/30 rounded-lg">
                <div className="text-xs text-slate-400">{item.symbol}</div>
                <div className="text-lg font-bold text-slate-100">{item.price.toFixed(2)}</div>
                <div className={`text-xs ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
