"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Calendar, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";

// 模拟报告数据
const mockReports = {
  weekly: [
    {
      id: "w1",
      title: "全球宏观周报：滞胀担忧升温",
      date: "2026-03-07",
      type: "weekly",
      coreThesis: "美国数据分化，中国政策托底，黄金避险需求上升",
      scenario: "stagflation",
      keyPoints: ["美联储降息预期推迟", "中国两会政策落地", "黄金突破历史高位"],
    },
    {
      id: "w2",
      title: "全球宏观周报：科技股引领反弹",
      date: "2026-02-28",
      type: "weekly",
      coreThesis: "AI投资热潮延续，美股科技板块领涨全球",
      scenario: "goldilocks",
      keyPoints: ["英伟达财报超预期", "中国科技股估值修复", "美债收益率回落"],
    },
    {
      id: "w3",
      title: "全球宏观周报：关税冲击与应对",
      date: "2026-02-21",
      type: "weekly",
      coreThesis: "特朗普关税政策引发市场波动，避险资产受追捧",
      scenario: "inflation",
      keyPoints: ["美加墨关税升级", "日元避险需求", "大宗商品上涨"],
    },
  ],
  quarterly: [
    {
      id: "q1",
      title: "2026年Q1季度展望：在新旧周期交汇处",
      date: "2026-01-15",
      type: "quarterly",
      coreThesis: "全球经济处于转型期， AI革命与债务周期交织， 配置需兼顾成长与防御",
      scenario: "goldilocks",
      keyPoints: ["AI投资周期持续", "中国政策转向积极", "美联储渐进降息", "黄金配置价值凸显"],
    },
  ],
};

const scenarioLabels: Record<string, string> = {
  inflation: "通胀",
  deflation: "通缩",
  goldilocks: "金发姑娘",
  stagflation: "滞胀",
};

const scenarioColors: Record<string, string> = {
  inflation: "bg-orange-100 text-orange-700",
  deflation: "bg-blue-100 text-blue-700",
  goldilocks: "bg-green-100 text-green-700",
  stagflation: "bg-red-100 text-red-700",
};

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("weekly");

  const handleGenerateReport = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">投资报告</h1>
          <p className="text-muted-foreground">AI宏观作手深度研究报告</p>
        </div>
        <Button onClick={handleGenerateReport} disabled={isLoading}>
          <FileText className="mr-2 h-4 w-4" />
          {isLoading ? "生成中..." : "生成新报告"}
        </Button>
      </div>

      {/* 报告类型标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">周度报告</TabsTrigger>
          <TabsTrigger value="quarterly">季度报告</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-6">
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              mockReports.weekly.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="mr-1 h-3 w-3" />
                            {report.date}
                          </Badge>
                          <Badge className={`text-xs ${scenarioColors[report.scenario]}`}>
                            {scenarioLabels[report.scenario]}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <CardDescription className="mt-2">{report.coreThesis}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {report.keyPoints.map((point, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="quarterly" className="mt-6">
          <div className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              mockReports.quarterly.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="mr-1 h-3 w-3" />
                            {report.date}
                          </Badge>
                          <Badge className={`text-xs ${scenarioColors[report.scenario]}`}>
                            {scenarioLabels[report.scenario]}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl">{report.title}</CardTitle>
                        <CardDescription className="mt-2 text-base">{report.coreThesis}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          核心观点
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {report.keyPoints.slice(0, 2).map((point, index) => (
                            <li key={index}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          投资建议
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {report.keyPoints.slice(2).map((point, index) => (
                            <li key={index}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 报告说明 */}
      <Card>
        <CardHeader>
          <CardTitle>报告说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                周度报告
              </h4>
              <p className="text-sm text-muted-foreground">
                每周日发布，总结过去一周全球市场动态，分析宏观情景变化，提供下周投资策略建议。
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                季度报告
              </h4>
              <p className="text-sm text-muted-foreground">
                每季度初发布，深度分析季度宏观趋势，评估资产配置策略，展望未来3个月投资机会。
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                免责声明
              </h4>
              <p className="text-sm text-muted-foreground">
                本报告仅供参考，不构成投资建议。投资有风险，入市需谨慎。过往业绩不代表未来表现。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
