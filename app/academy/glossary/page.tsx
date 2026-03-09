"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  BookOpen, 
  ArrowLeft, 
  Star,
  Calculator,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

interface Term {
  id: string;
  cn: string;
  en: string;
  category: string;
  definition: string;
  explanation: string;
  formula?: string;
  example: string;
}

const terms: Term[] = [
  {
    id: "sharpe",
    cn: "夏普比率",
    en: "Sharpe Ratio",
    category: "风险指标",
    definition: "衡量风险调整后收益的指标，表示每承担一单位风险所获得的超额收益。",
    explanation: "夏普比率越高，说明投资组合在承担相同风险的情况下获得的收益越高。通常认为夏普比率大于1是良好的，大于2是优秀的。",
    formula: "Sharpe = (Rp - Rf) / σp",
    example: "某基金年化收益15%，无风险利率3%，年化波动率12%，则夏普比率 = (15%-3%)/12% = 1.0",
  },
  {
    id: "max-drawdown",
    cn: "最大回撤",
    en: "Maximum Drawdown",
    category: "风险指标",
    definition: "在选定周期内，从资产最高点到最低点的最大跌幅。",
    explanation: "最大回撤反映了投资可能面临的最严重亏损情况，是衡量风险的重要指标。投资者应确保自己能承受该级别的回撤。",
    formula: "MDD = (Trough - Peak) / Peak",
    example: "资产从100元涨到150元后跌至80元，最大回撤 = (80-150)/150 = -46.7%",
  },
  {
    id: "volatility",
    cn: "波动率",
    en: "Volatility",
    category: "风险指标",
    definition: "资产价格变动的幅度，通常用标准差衡量。",
    explanation: "波动率越高，资产价格变动越剧烈，风险越大。年化波动率 = 日波动率 × √252。",
    formula: "σ = √(Σ(Ri - R̄)² / n)",
    example: "标普500历史年化波动率约15-20%，而比特币可达60-80%",
  },
  {
    id: "correlation",
    cn: "相关系数",
    en: "Correlation Coefficient",
    category: "统计指标",
    definition: "衡量两个资产价格变动相关程度的指标，范围-1到1。",
    explanation: "1表示完全正相关，-1表示完全负相关，0表示无关。低相关性资产组合可降低整体风险。",
    formula: "ρ = Cov(X,Y) / (σx × σy)",
    example: "美股与美债通常呈负相关（约-0.3），适合作为对冲组合",
  },
  {
    id: "alpha",
    cn: "阿尔法",
    en: "Alpha",
    category: "收益指标",
    definition: "超越基准指数的超额收益，代表投资能力。",
    explanation: "正阿尔法表示跑赢市场，负阿尔法表示跑输。主动管理型基金追求正阿尔法收益。",
    formula: "α = Rp - [Rf + β(Rm - Rf)]",
    example: "某基金收益20%，基准收益15%，β=1.1，则阿尔法 = 20% - [3% + 1.1(15%-3%)] = 3.8%",
  },
  {
    id: "beta",
    cn: "贝塔系数",
    en: "Beta",
    category: "风险指标",
    definition: "衡量资产相对于市场的系统性风险敏感度。",
    explanation: "β=1表示与市场同步，β>1表示波动大于市场，β<1表示波动小于市场。",
    formula: "β = Cov(Ri,Rm) / Var(Rm)",
    example: "β=1.5表示市场涨10%时，该资产平均涨15%；市场跌10%时，该资产平均跌15%",
  },
  {
    id: "inflation",
    cn: "通货膨胀",
    en: "Inflation",
    category: "宏观概念",
    definition: "货币购买力下降，物价水平持续上涨的经济现象。",
    explanation: "通胀侵蚀现金价值，利好实物资产（房地产、商品）和股票，利空债券和现金。",
    example: "年通胀率3%意味着100元一年后只能购买相当于现在97元的商品",
  },
  {
    id: "deflation",
    cn: "通货紧缩",
    en: "Deflation",
    category: "宏观概念",
    definition: "物价水平持续下降，货币购买力上升的经济现象。",
    explanation: "通缩利好现金和债券，利空实物资产和股票。历史上通缩往往伴随经济衰退。",
    example: "日本1990年代失去的二十年就是典型的通缩周期",
  },
  {
    id: "stagflation",
    cn: "滞胀",
    en: "Stagflation",
    category: "宏观概念",
    definition: "经济停滞（低增长/衰退）与高通胀并存的状态。",
    explanation: "滞胀是最恶劣的宏观环境，股票和债券双杀，只有黄金、商品等实物资产表现较好。",
    example: "1970年代美国石油危机期间，GDP负增长同时CPI超过10%",
  },
  {
    id: "goldilocks",
    cn: "金发姑娘经济",
    en: "Goldilocks Economy",
    category: "宏观概念",
    definition: "经济增长强劲但通胀温和的理想状态。",
    explanation: "金发姑娘时期股票表现最佳，是风险资产的甜蜜点。通常出现在经济复苏中期。",
    example: "2010年代美股长牛就是典型的金发姑娘时期：增长稳定、通胀低迷、利率下行",
  },
  {
    id: "liquidity",
    cn: "流动性",
    en: "Liquidity",
    category: "宏观概念",
    definition: "资产变现的难易程度，或市场资金的充裕程度。",
    explanation: "高流动性环境下资产价格上涨，低流动性（流动性紧缩）往往引发市场下跌。",
    example: "2020年美联储大放水，流动性泛滥推动美股、比特币大涨",
  },
  {
    id: "risk-premium",
    cn: "风险溢价",
    en: "Risk Premium",
    category: "收益指标",
    definition: "投资者承担风险所要求的额外收益补偿。",
    explanation: "股票风险溢价通常为3-5%，即股票预期收益应比无风险利率高3-5个百分点。",
    formula: "风险溢价 = E(Rm) - Rf",
    example: "若预期股票收益8%，国债收益3%，则风险溢价 = 5%",
  },
];

const categories = ["全部", "风险指标", "收益指标", "统计指标", "宏观概念"];

export default function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      const matchesSearch = 
        term.cn.toLowerCase().includes(search.toLowerCase()) ||
        term.en.toLowerCase().includes(search.toLowerCase()) ||
        term.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "全部" || term.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/academy">
          <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-slate-200" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-50">
            术语词典
          </h1>
          <p className="text-sm text-slate-500">Investment Glossary</p>
        </div>
      </div>

      {/* Search & Filter */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="搜索术语（中文/英文）..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                  selectedCategory === cat
                    ? "bg-amber-500 text-slate-950 font-medium"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terms List */}
      <div className="space-y-3">
        {filteredTerms.map((term) => (
          <Card 
            key={term.id}
            className={`bg-slate-900/50 border-slate-800 transition-all cursor-pointer ${
              expandedTerm === term.id ? "border-amber-500/30" : "hover:border-slate-700"
            }`}
            onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base text-slate-100">{term.cn}</CardTitle>
                    <span className="text-xs text-slate-500">{term.en}</span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-400 text-xs">
                    {term.category}
                  </Badge>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(term.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Star 
                    className={`w-4 h-4 ${
                      favorites.includes(term.id) 
                        ? "fill-amber-500 text-amber-500" 
                        : "text-slate-600"
                    }`} 
                  />
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-slate-300 mb-3">{term.definition}</p>
              
              {expandedTerm === term.id && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      详细解释
                    </div>
                    <p className="text-sm text-slate-400">{term.explanation}</p>
                  </div>
                  
                  {term.formula && (
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Calculator className="w-3.5 h-3.5" />
                        计算公式
                      </div>
                      <code className="text-sm bg-slate-800 px-2 py-1 rounded text-amber-400 font-mono">
                        {term.formula}
                      </code>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      实际案例
                    </div>
                    <p className="text-sm text-slate-400">{term.example}</p>
                  </div>
                </div>
              )}
              
              {expandedTerm !== term.id && (
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <span>点击展开详情</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>未找到匹配的术语</p>
        </div>
      )}
    </div>
  );
}
