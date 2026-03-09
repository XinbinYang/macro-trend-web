"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Lightbulb, 
  TrendingUp, 
  Shield, 
  Target,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";

interface Strategy {
  id: string;
  name: string;
  subtitle?: string;
  founder: string;
  year: string;
  icon: typeof Lightbulb;
  color: string;
  coreIdea: string;
  description: string;
  allocation: { name: string; percent: number; color: string }[];
  keyPoints: string[];
  caseStudy: string;
  suitableFor: string[];
}

const strategies: Strategy[] = [
  {
    id: "all-weather",
    name: "全天候策略",
    subtitle: "All Weather Strategy",
    founder: "Ray Dalio",
    year: "1996",
    icon: Shield,
    color: "from-blue-500 to-cyan-500",
    coreIdea: "风险平价配置，在任何经济环境下都能获得稳定收益",
    description: "桥水基金创始人达利欧提出的经典策略。核心思想是均衡配置不同资产，使得各资产对组合的风险贡献相等。通过分散投资于股票、债券、商品等不同经济环境下的表现资产，实现长期稳定的绝对收益。",
    allocation: [
      { name: "股票", percent: 30, color: "#3b82f6" },
      { name: "长期国债", percent: 40, color: "#22c55e" },
      { name: "中期国债", percent: 15, color: "#10b981" },
      { name: "大宗商品", percent: 7.5, color: "#f59e0b" },
      { name: "黄金", percent: 7.5, color: "#eab308" },
    ],
    keyPoints: [
      "不预测经济周期，而是均衡配置应对各种环境",
      "使用杠杆提升低风险资产（债券）的收益贡献",
      "股票30%看似低，但通过风险平价实际贡献与债券相当",
      "长期回测显示年化收益约10%，最大回撤约15%",
    ],
    caseStudy: "2008年金融危机期间，传统60/40组合下跌约20%，而全天候策略仅下跌约4%，展现了强大的风险控制能力。",
    suitableFor: ["稳健型投资者", "长期配置", "风险厌恶型"],
  },
  {
    id: "reflexivity",
    name: "反身性策略",
    subtitle: "Reflexivity Strategy",
    founder: "George Soros",
    year: "1969",
    icon: Lightbulb,
    color: "from-purple-500 to-pink-500",
    coreIdea: "利用市场预期与现实的偏差，在趋势形成初期介入",
    description: "索罗斯提出的哲学投资框架。反身性指市场预期会影响现实，而现实变化又会改变预期，形成正反馈循环。策略核心是识别这种反馈循环的形成点，在趋势加速期介入，在泡沫破裂前退出。",
    allocation: [
      { name: "趋势仓位", percent: 50, color: "#8b5cf6" },
      { name: "对冲仓位", percent: 30, color: "#06b6d4" },
      { name: "现金储备", percent: 20, color: "#64748b" },
    ],
    keyPoints: [
      "寻找市场错误定价的机会，而非追求有效市场假说",
      "经典案例：1992年狙击英镑获利10亿美元",
      "强调认知偏差和群体心理对价格的影响",
      "高波动、高回报，需要极强的心理素质",
    ],
    caseStudy: "1992年黑色星期三，索罗斯判断英镑被高估，建立100亿美元空头头寸。英国政府被迫退出欧洲汇率机制，索罗斯一日获利10亿美元。",
    suitableFor: ["激进型投资者", "趋势交易者", "宏观对冲"],
  },
  {
    id: "debt-cycle",
    name: "债务周期策略",
    subtitle: "Debt Cycle Strategy",
    founder: "Ray Dalio",
    year: "2018",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-500",
    coreIdea: "识别长期债务周期位置，调整资产配置",
    description: "达利欧在《原则：应对变化中的世界秩序》中系统阐述。经济由短期债务周期（5-8年）和长期债务周期（50-75年）叠加驱动。策略核心是判断当前所处周期阶段，在债务扩张期加杠杆，在债务收缩期降杠杆持现金。",
    allocation: [
      { name: "风险资产", percent: 60, color: "#f59e0b" },
      { name: "避险资产", percent: 25, color: "#22c55e" },
      { name: "现金", percent: 15, color: "#64748b" },
    ],
    keyPoints: [
      "长期债务周期分为6个阶段：早期、泡沫、顶峰、萧条、去杠杆、正常化",
      "当前（2020s）处于第5阶段：印钞和债务货币化",
      "关注债务/GDP比率、利率水平、货币政策空间",
      "最终阶段通常伴随货币贬值和实物资产上涨",
    ],
    caseStudy: "2008年后美联储QE政策使美股走出长牛。理解债务周期的投资者会在2009年大胆买入，在2020年疫情冲击时利用流动性危机加仓。",
    suitableFor: ["宏观投资者", "长期配置", "机构资金"],
  },
  {
    id: "value-macro",
    name: "价值宏观策略",
    subtitle: "Value + Macro Strategy",
    founder: "Warren Buffett",
    year: "1956",
    icon: Target,
    color: "from-green-500 to-emerald-500",
    coreIdea: "优质企业 + 宏观择时，别人恐惧时贪婪",
    description: "巴菲特将格雷厄姆的价值投资与宏观判断相结合。核心是寻找具有护城河的优秀企业，在宏观环境恶化导致股价低估时买入，长期持有。强调安全边际和逆向投资。",
    allocation: [
      { name: "核心持仓", percent: 70, color: "#22c55e" },
      { name: "机会仓位", percent: 20, color: "#10b981" },
      { name: "现金储备", percent: 10, color: "#64748b" },
    ],
    keyPoints: [
      "关注ROE、毛利率、自由现金流等企业质量指标",
      "宏观择时：高利率环境等待，低利率环境积极",
      "经典语录：\"别人贪婪我恐惧，别人恐惧我贪婪\"",
      "2008年金融危机期间大举投资高盛、通用电气",
    ],
    caseStudy: "2008年金融危机期间，巴菲特在他人恐慌时向高盛投资50亿美元优先股，获得10%股息率加权证。这笔投资最终获利超过30亿美元。",
    suitableFor: ["价值投资者", "长期持有", "逆向投资"],
  },
];

export default function StrategiesPage() {
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>("all-weather");

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/academy">
          <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-slate-200" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">
            策略案例
          </h1>
          <p className="text-sm text-slate-500">Classic Investment Strategies</p>
        </div>
      </div>

      {/* Intro */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/20">
        <CardContent className="p-4">
          <p className="text-sm text-slate-300">
            学习投资大师的经典策略，理解其核心理念和实际应用。
            每个策略都包含资产配置方案、关键要点和经典案例。
          </p>
        </CardContent>
      </Card>

      {/* Strategies */}
      <div className="space-y-4">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          const isExpanded = expandedStrategy === strategy.id;
          
          return (
            <Card 
              key={strategy.id}
              className="bg-slate-900/50 border-slate-800 overflow-hidden"
            >
              <CardHeader 
                className="pb-3 cursor-pointer"
                onClick={() => setExpandedStrategy(isExpanded ? null : strategy.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${strategy.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base text-slate-100">{strategy.name}</CardTitle>
                        <span className="text-xs text-slate-500">{strategy.subtitle}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">创始人: {strategy.founder}</span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-400">{strategy.year}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                
                <p className="text-sm text-slate-400 mt-2">{strategy.coreIdea}</p>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {/* Description */}
                  <div>
                    <h4 className="text-xs text-slate-500 mb-1.5">策略详解</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{strategy.description}</p>
                  </div>
                  
                  {/* Allocation */}
                  <div>
                    <h4 className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      资产配置
                    </h4>
                    <div className="flex h-4 rounded-full overflow-hidden">
                      {strategy.allocation.map((item) => (
                        <div
                          key={item.name}
                          style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                          className="first:rounded-l-full last:rounded-r-full"
                          title={`${item.name}: ${item.percent}%`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {strategy.allocation.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-slate-400">
                            {item.name} {item.percent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Key Points */}
                  <div>
                    <h4 className="text-xs text-slate-500 mb-2">核心要点</h4>
                    <ul className="space-y-1.5">
                      {strategy.keyPoints.map((point, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-amber-500 mt-1">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Case Study */}
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <h4 className="text-xs text-amber-500 mb-1.5">经典案例</h4>
                    <p className="text-sm text-slate-400">{strategy.caseStudy}</p>
                  </div>
                  
                  {/* Suitable For */}
                  <div>
                    <h4 className="text-xs text-slate-500 mb-2">适合人群</h4>
                    <div className="flex flex-wrap gap-2">
                      {strategy.suitableFor.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="bg-slate-800 text-slate-400 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-blue-400 mb-1">实践建议</h3>
              <p className="text-sm text-slate-400">
                没有完美的策略，关键是找到适合自己风险偏好和投资目标的策略，并坚持执行。
              </p>
            </div>
            <Link href="/academy/glossary">
              <Button variant="outline" className="border-slate-700 text-slate-300">
                学习术语
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
