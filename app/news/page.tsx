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
  Clock,
  ArrowRight
} from "lucide-react";

// 模拟实时数据
const marketEvents = [
  {
    id: "1",
    time: "10:30",
    type: "data",
    title: "美国2月CPI数据公布",
    content: "同比3.2%，预期3.1%，前值3.1%。通胀略高于预期，美联储降息预期降温。",
    impact: "high",
    assets: ["美股", "美债", "黄金"],
  },
  {
    id: "2",
    time: "09:15",
    type: "policy",
    title: "欧洲央行维持利率不变",
    content: "欧央行维持主要再融资利率4.5%，符合市场预期。拉加德表示需要更多数据确认通胀回落。",
    impact: "medium",
    assets: ["欧元", "欧股"],
  },
  {
    id: "3",
    time: "08:45",
    type: "market",
    title: "原油价格突破85美元",
    content: "WTI原油上涨2.3%，因地缘政治紧张加剧供应担忧。能源股普遍上涨。",
    impact: "high",
    assets: ["原油", "能源股"],
  },
  {
    id: "4",
    time: "08:00",
    type: "ai",
    title: "AI宏观作手：周期判断更新",
    content: "基于最新数据，我们将经济周期从\"扩张期\"调整为\"扩张后期\"，建议适度降低风险敞口。",
    impact: "medium",
    assets: ["全市场"],
  },
];

const upcomingEvents = [
  { date: "3月20日", time: "02:00", event: "美联储利率决议", importance: "high" },
  { date: "3月21日", time: "20:30", event: "美国初请失业金人数", importance: "medium" },
  { date: "3月22日", time: "09:30", event: "中国LPR报价", importance: "medium" },
  { date: "3月26日", time: "20:30", event: "美国2月PCE物价指数", importance: "high" },
];

const signals = [
  {
    id: "1",
    type: "warning",
    title: "美股波动率上升",
    description: "VIX指数突破20，市场不确定性增加",
    suggestion: "考虑降低仓位或购买保护性期权",
  },
  {
    id: "2",
    type: "opportunity",
    title: "黄金突破关键技术位",
    description: "金价突破2150美元，创历史新高",
    suggestion: "趋势跟踪，关注回调买入机会",
  },
  {
    id: "3",
    type: "info",
    title: "美债收益率曲线走平",
    description: "10Y-2Y利差收窄至20bp",
    suggestion: "关注经济衰退风险，增配防御性资产",
  },
];

export default function NewsPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "data": return <TrendingUp className="w-4 h-4" />;
      case "policy": return <Bell className="w-4 h-4" />;
      case "market": return <TrendingUp className="w-4 h-4" />;
      case "ai": return <Sparkles className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">
            实时资讯
          </h1>
          <p className="text-sm text-slate-500">
            {currentTime.toLocaleString()} · 自动更新
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1.5"></span>
            实时连接
          </Badge>
        </div>
      </div>

      {/* 信号预警 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {signals.map((signal) => (
          <Card 
            key={signal.id} 
            className={`border-l-4 ${
              signal.type === 'warning' ? 'border-l-red-500 bg-red-500/5' :
              signal.type === 'opportunity' ? 'border-l-green-500 bg-green-500/5' :
              'border-l-blue-500 bg-blue-500/5'
            } bg-slate-900/50 border-slate-800`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${
                  signal.type === 'warning' ? 'text-red-400' :
                  signal.type === 'opportunity' ? 'text-green-400' :
                  'text-blue-400'
                }`}>
                  {signal.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                   signal.type === 'opportunity' ? <TrendingUp className="w-5 h-5" /> :
                   <Bell className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-100 text-sm">{signal.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{signal.description}</p>
                  <p className="text-xs text-amber-400 mt-2">{signal.suggestion}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 市场动态 */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-serif font-bold text-slate-100 flex items-center gap-2">
            <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
            市场动态
          </h2>
          
          <div className="space-y-3">
            {marketEvents.map((event) => (
              <Card key={event.id} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center min-w-[50px]">
                      <span className="text-xs text-slate-500">{event.time}</span>
                      <div className={`mt-1 p-1.5 rounded-lg bg-slate-800 text-slate-400`}>
                        {getTypeIcon(event.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-slate-100">{event.title}</h3>
                        <Badge className={`text-xs ${getImpactColor(event.impact)}`}>
                          {event.impact === 'high' ? '高影响' : event.impact === 'medium' ? '中影响' : '低影响'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{event.content}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {event.assets.map((asset) => (
                          <span key={asset} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-500 rounded">
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 日历 */}
        <div className="space-y-4">
          <h2 className="text-lg font-serif font-bold text-slate-100 flex items-center gap-2">
            <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
            财经日历
          </h2>
          
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="space-y-3">
                {upcomingEvents.map((event, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg"
                  >
                    <div className="flex flex-col items-center min-w-[60px]">
                      <span className="text-xs text-slate-500">{event.date}</span>
                      <span className="text-sm font-medium text-slate-300">{event.time}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-200">{event.event}</span>
                        {event.importance === 'high' && (
                          <Badge className="bg-red-500/20 text-red-400 text-xs">重要</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI解读 */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-400">
                <Sparkles className="w-4 h-4" />
                AI市场解读
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300 leading-relaxed">
                基于最新CPI数据，通胀粘性超预期，市场对美联储6月前降息的预期从80%降至60%。
                建议关注：1）美债收益率可能继续上行；2）黄金短期承压但中期仍看好；3）科技股估值承压。
              </p>
              <Button variant="link" className="text-amber-400 p-0 h-auto mt-2 text-sm">
                查看完整分析 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
