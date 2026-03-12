import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Droplets, Flame, Landmark, LineChart, ShieldAlert } from "lucide-react";

const dimensions = [
  {
    title: "增长 Growth",
    icon: <LineChart className="w-4 h-4 text-green-400" />,
    status: "中性偏弱",
    note: "当前作为研究占位模块，待接中美真实宏观状态引擎。",
  },
  {
    title: "通胀 Inflation",
    icon: <Flame className="w-4 h-4 text-red-400" />,
    status: "回落观察",
    note: "后续接 CPI / PPI / 通胀预期与资产映射。",
  },
  {
    title: "政策 Policy",
    icon: <Landmark className="w-4 h-4 text-amber-400" />,
    status: "等待细化",
    note: "后续接美联储 / 中国政策利率与政策偏向。",
  },
  {
    title: "流动性 Liquidity",
    icon: <Droplets className="w-4 h-4 text-cyan-400" />,
    status: "等待细化",
    note: "后续接信用脉冲、M2、收益率曲线与美元流动性。",
  },
];

const regions = [
  {
    title: "🇺🇸 美国主轴",
    bullets: [
      "增长 / 通胀 / 政策 / 流动性四维框架",
      "后续映射美股、美债、美元、黄金",
      "作为全球风险偏好主驱动",
    ],
  },
  {
    title: "🇨🇳 中国主轴",
    bullets: [
      "增长 / 信用 / 地产 / 政策宽松节奏",
      "后续映射 A 股、国债、商品链",
      "作为全球需求与信用脉冲的重要来源",
    ],
  },
];

export default function MacroPage() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="space-y-2">
        <div className="text-sm text-amber-400 font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Macro Research Hub
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-50">宏观研究中枢 / Macro Hub</h1>
        <p className="text-sm text-slate-400">🌍 用于承接中美双主轴、四维宏观框架、regime 判断与后续研究卡片。</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" /> 当前定位</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div>🎯 这里不是资讯页，而是未来的 <span className="text-amber-400 font-medium">宏观研究中枢</span>。</div>
          <div>📌 当前版本先落研究骨架，下一阶段逐步接入真实宏观状态与中美双主轴研究模块。</div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {dimensions.map((item) => (
          <Card key={item.title} className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                {item.icon}
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{item.status}</Badge>
              <div className="text-xs text-slate-400">{item.note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {regions.map((region) => (
          <Card key={region.title} className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">{region.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-300">
                {region.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}