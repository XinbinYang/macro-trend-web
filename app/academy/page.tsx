"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  RefreshCw, 
  Droplets, 
  BarChart3, 
  BookOpen, 
  Lightbulb,
  ArrowRight,
  GraduationCap
} from "lucide-react";

const modules = [
  {
    id: "cycle",
    title: "周期分析",
    subtitle: "Cycle Analysis",
    icon: TrendingUp,
    color: "from-blue-500 to-cyan-500",
    description: "经济周期的四个阶段：复苏、扩张、滞胀、衰退。识别当前所处位置，预判资产轮动。",
    topics: ["库存周期", "资本支出周期", "房地产周期", "债务周期"],
  },
  {
    id: "reflexivity",
    title: "反身性理论",
    subtitle: "Reflexivity",
    icon: RefreshCw,
    color: "from-purple-500 to-pink-500",
    description: "索罗斯核心理论：市场预期与现实相互影响，形成正反馈循环，产生泡沫与崩溃。",
    topics: ["认知函数", "操纵函数", "正反馈循环", "市场错误定价"],
  },
  {
    id: "liquidity",
    title: "流动性分析",
    subtitle: "Liquidity",
    icon: Droplets,
    color: "from-amber-500 to-orange-500",
    description: "全球央行货币政策、信贷周期、美元流动性。流动性是资产价格的根本驱动力。",
    topics: ["央行政策", "信贷周期", "美元流动性", "跨境资本流动"],
  },
  {
    id: "technical",
    title: "技术趋势",
    subtitle: "Technical Trend",
    icon: BarChart3,
    color: "from-green-500 to-emerald-500",
    description: "价格行为、趋势识别、支撑阻力、动量指标。技术分析辅助判断入场时机。",
    topics: ["趋势识别", "支撑阻力", "动量指标", "量价分析"],
  },
];

const quickLinks = [
  {
    title: "术语词典",
    description: "投资专业术语详解",
    icon: BookOpen,
    href: "/academy/glossary",
    color: "text-blue-400",
  },
  {
    title: "策略案例",
    description: "经典宏观策略解析",
    icon: Lightbulb,
    href: "/academy/strategies",
    color: "text-amber-400",
  },
];

export default function AcademyPage() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-6 md:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2NGgtNHpNMjAgMjBoNHY0aC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-50">
                投资学院
              </h1>
              <p className="text-sm text-slate-400">Investment Academy</p>
            </div>
          </div>
          
          <p className="text-slate-300 max-w-2xl leading-relaxed">
            系统学习全球宏观投资方法论。掌握周期分析、反身性理论、流动性分析和技术趋势四大维度，
            构建完整的投资框架，提升资产配置能力。
          </p>
        </div>
      </div>

      {/* 四大核心模块 */}
      <div>
        <h2 className="text-lg font-serif font-bold text-slate-100 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
          四大分析维度
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card 
                key={module.id}
                className="group bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base md:text-lg text-slate-100 group-hover:text-amber-400 transition-colors">
                          {module.title}
                        </CardTitle>
                        <p className="text-xs text-slate-500">{module.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                    {module.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {module.topics.map((topic) => (
                      <span 
                        key={topic}
                        className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-md"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 快速链接 */}
      <div>
        <h2 className="text-lg font-serif font-bold text-slate-100 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
          学习资源
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="group bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer h-full">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors`}>
                      <Icon className={`w-6 h-6 ${link.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-100 group-hover:text-amber-400 transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-xs text-slate-500">{link.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 学习路径提示 */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/20">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-amber-400 mb-1">推荐学习路径</h3>
              <p className="text-sm text-slate-400">
                建议从「周期分析」开始，逐步深入四大维度，最后结合实际策略案例进行综合运用。
              </p>
            </div>
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-medium">
              开始学习
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
