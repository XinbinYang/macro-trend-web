"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, TrendingUp, AlertTriangle, FileText, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

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

// 模拟从 localStorage 获取报告
const getReportFromStorage = (id: string): Report | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(`report_${id}`);
  return stored ? JSON.parse(stored) : null;
};

// 模拟历史报告数据
const mockReports: Record<string, Report> = {
  "w1": {
    id: "w1",
    title: "全球宏观周报：滞胀担忧升温",
    date: "2026-03-07",
    type: "weekly",
    coreThesis: "美国数据分化，中国政策托底，黄金避险需求上升",
    scenario: "stagflation",
    keyPoints: ["美联储降息预期推迟", "中国两会政策落地", "黄金突破历史高位"],
    content: "## 市场回顾\n\n本周全球市场呈现分化态势。美股在科技股带动下维持高位震荡，但小盘股表现相对疲软。\n\n## 核心观点\n\n1. **美联储政策**：降息预期进一步推迟，点阵图显示年内降息次数减少。\n\n2. **中国政策**：两会释放积极信号，财政发力可期。\n\n3. **黄金突破**：避险情绪推动金价创历史新高。",
  },
  "w2": {
    id: "w2",
    title: "全球宏观周报：科技股引领反弹",
    date: "2026-02-28",
    type: "weekly",
    coreThesis: "AI投资热潮延续，美股科技板块领涨全球",
    scenario: "goldilocks",
    keyPoints: ["英伟达财报超预期", "中国科技股估值修复", "美债收益率回落"],
    content: "## 市场回顾\n\nAI投资主题持续发酵，科技股引领全球市场反弹。\n\n## 核心观点\n\n1. **AI热潮**：英伟达财报验证AI需求强劲。\n\n2. **估值修复**：中国科技股经历调整后迎来反弹。\n\n3. **利率环境**：美债收益率回落利好成长股。",
  },
  "w3": {
    id: "w3",
    title: "全球宏观周报：关税冲击与应对",
    date: "2026-02-21",
    type: "weekly",
    coreThesis: "特朗普关税政策引发市场波动，避险资产受追捧",
    scenario: "inflation",
    keyPoints: ["美加墨关税升级", "日元避险需求", "大宗商品上涨"],
    content: "## 市场回顾\n\n关税政策不确定性升温，市场波动加剧。\n\n## 核心观点\n\n1. **关税冲击**：美加墨关税升级引发供应链担忧。\n\n2. **避险需求**：日元等传统避险资产受追捧。\n\n3. **商品上涨**：通胀预期推升大宗商品价格。",
  },
};

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 优先从 localStorage 获取（AI生成的报告）
    const storedReport = getReportFromStorage(reportId);
    if (storedReport) {
      setReport(storedReport);
    } else if (mockReports[reportId]) {
      // 否则从历史记录获取
      setReport(mockReports[reportId]);
    }
    setIsLoading(false);
  }, [reportId]);

  const handleDelete = () => {
    // 从 localStorage 删除
    if (typeof window !== "undefined") {
      localStorage.removeItem(`report_${reportId}`);
    }
    // 返回报告列表
    router.push("/reports");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <Link href="/reports" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          返回报告列表
        </Link>
        <div className="text-center py-20">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">报告未找到</h1>
          <p className="text-muted-foreground">该报告不存在或已被删除</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回导航 */}
      <div className="flex items-center justify-between">
        <Link href="/reports" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          返回报告列表
        </Link>
        
        {/* 删除按钮 */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="w-4 h-4" />
              删除报告
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
              <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* 报告头部 */}
      <div className="border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
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
              {typeof report.usage?.totalTokens === "number" && (
                <Badge variant="outline" className="text-xs font-mono">
                  {report.usage.totalTokens.toLocaleString()} tok
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">{report.title}</h1>
          </div>
        </div>
        
        <p className="text-muted-foreground text-lg">{report.coreThesis}</p>
      </div>

      {/* 关键要点 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            关键要点
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {report.keyPoints.map((point, index) => (
              <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                {index + 1}. {point}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 报告正文 */}
      <Card>
        <CardHeader>
          <CardTitle>报告详情</CardTitle>
        </CardHeader>
        <CardContent>
          {report.content ? (
            <div className="prose prose-sm max-w-none whitespace-pre-line">
              {report.content}
            </div>
          ) : (
            <div className="text-muted-foreground">
              <p>该报告暂无详细内容。</p>
              <p className="mt-2">核心观点：{report.coreThesis}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 免责声明 */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            免责声明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            本报告仅供参考，不构成投资建议。投资有风险，入市需谨慎。过往业绩不代表未来表现。
            报告内容由 AI 基于公开数据生成，可能存在误差，请独立判断。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
