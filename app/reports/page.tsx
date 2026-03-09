"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Calendar, TrendingUp, AlertTriangle, Lightbulb, Sparkles, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Report {
  id: string;
  title: string;
  date: string;
  type: string;
  coreThesis: string;
  scenario: string;
  keyPoints: string[];
  content?: string;
  model?: string;
}

// 历史报告（保留作为参考）
const historicalReports: Report[] = [
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
];

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
  const [generatedReport, setGeneratedReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 页面加载时从 localStorage 读取最近生成的报告
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 查找所有报告
      const reports: Report[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("report_")) {
          const report = localStorage.getItem(key);
          if (report) {
            try {
              reports.push(JSON.parse(report));
            } catch (e) {
              console.error("Failed to parse report:", e);
            }
          }
        }
      }
      // 按日期排序，取最新的
      reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (reports.length > 0) {
        setGeneratedReport(reports[0]);
      }
    }
  }, []);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedReport(data.report);
        // 保存到 localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(`report_${data.report.id}`, JSON.stringify(data.report));
        }
      } else {
        setError(data.error || "生成失败");
      }
    } catch (err) {
      setError("网络请求失败");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [reports, setReports] = useState<Report[]>(historicalReports);

  const displayReports = generatedReport 
    ? [generatedReport, ...reports.filter(r => r.type === activeTab)]
    : reports.filter(r => r.type === activeTab);

  const handleDeleteReport = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
    // 也从 localStorage 删除（如果是AI生成的）
    if (typeof window !== "undefined") {
      localStorage.removeItem(`report_${reportId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">投资报告</h1>
          <p className="text-muted-foreground">AI宏观作手深度研究报告</p>
        </div>
        <Button onClick={handleGenerateReport} disabled={isLoading} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {isLoading ? "AI生成中..." : "生成新报告"}
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
          {error}，请稍后重试
        </div>
      )}

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
                <div className="p-8 text-center border rounded-lg">
                  <Sparkles className="w-8 h-8 mx-auto mb-4 animate-pulse text-primary" />
                  <p className="text-muted-foreground">GPT-5.4 正在分析市场数据并生成报告...</p>
                </div>
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              displayReports.map((report, index) => (
                <Card key={report.id} className={`hover:shadow-md transition-shadow ${index === 0 && generatedReport ? 'border-primary' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => window.location.href = `/reports/${report.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="mr-1 h-3 w-3" />
                            {report.date}
                          </Badge>
                          <Badge className={`text-xs ${scenarioColors[report.scenario]}`}>
                            {scenarioLabels[report.scenario]}
                          </Badge>
                          {report.model && (
                            <Badge variant="secondary" className="text-xs">
                              {report.model}
                            </Badge>
                          )}
                          {index === 0 && generatedReport && (
                            <Badge className="text-xs bg-purple-100 text-purple-700">
                              刚刚生成
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg hover:text-primary transition-colors">{report.title}</CardTitle>
                        <CardDescription className="mt-2">{report.coreThesis}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/reports/${report.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除报告「{report.title}」吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteReport(report.id)} className="bg-destructive">
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {report.keyPoints.map((point, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
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
              <div className="p-8 text-center border rounded-lg">
                <Sparkles className="w-8 h-8 mx-auto mb-4 animate-pulse text-primary" />
                <p className="text-muted-foreground">GPT-5.4 正在生成季度展望...</p>
              </div>
            ) : displayReports.length > 0 ? (
              displayReports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
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
                          {report.model && (
                            <Badge variant="secondary" className="text-xs">
                              {report.model}
                            </Badge>
                          )}
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
                          {report.keyPoints.slice(0, 2).map((point, idx) => (
                            <li key={idx}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          投资建议
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {report.keyPoints.slice(2).map((point, idx) => (
                            <li key={idx}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {report.content && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-line">
                        {report.content}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无季度报告，点击上方按钮生成</p>
              </div>
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
                <Sparkles className="h-4 w-4 text-primary" />
                AI驱动
              </h4>
              <p className="text-sm text-muted-foreground">
                报告由 GPT-5.4 基于实时市场数据生成，融合四大分析维度。
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                定期更新
              </h4>
              <p className="text-sm text-muted-foreground">
                周度报告每周更新，季度报告每季度初发布，紧跟市场节奏。
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                免责声明
              </h4>
              <p className="text-sm text-muted-foreground">
                本报告仅供参考，不构成投资建议。投资有风险，入市需谨慎。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
