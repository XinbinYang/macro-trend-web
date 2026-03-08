"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface DataSourceStatus {
  name: string;
  status: "loading" | "success" | "error" | "mock";
  data?: unknown;
  error?: string;
}

export default function DataTestPage() {
  const [sources, setSources] = useState<DataSourceStatus[]>([
    { name: "FRED API (美国宏观)", status: "loading" },
    { name: "东方财富 (A股)", status: "loading" },
    { name: "Market Snapshot", status: "loading" },
  ]);

  const testDataSources = async () => {
    setSources(prev => prev.map(s => ({ ...s, status: "loading" })));

    // Test FRED API
    try {
      const fredRes = await fetch("/api/market-data?type=macro");
      const fredData = await fredRes.json();
      
      setSources(prev => prev.map(s => 
        s.name === "FRED API (美国宏观)" 
          ? { 
              ...s, 
              status: fredData.source === "fred" ? "success" : "mock",
              data: fredData.indicators
            }
          : s
      ));
    } catch (error) {
      setSources(prev => prev.map(s => 
        s.name === "FRED API (美国宏观)" 
          ? { ...s, status: "error", error: String(error) }
          : s
      ));
    }

    // Test A-Share API
    try {
      const aShareRes = await fetch("/api/market-data?type=a-share");
      const aShareData = await aShareRes.json();
      
      setSources(prev => prev.map(s => 
        s.name === "东方财富 (A股)" 
          ? { 
              ...s, 
              status: aShareData.source === "real" ? "success" : "mock",
              data: aShareData.data?.[0]
            }
          : s
      ));
    } catch (error) {
      setSources(prev => prev.map(s => 
        s.name === "东方财富 (A股)" 
          ? { ...s, status: "error", error: String(error) }
          : s
      ));
    }

    // Test Market Snapshot
    try {
      const snapshotRes = await fetch("/api/market-data?type=snapshot");
      const snapshotData = await snapshotRes.json();
      
      setSources(prev => prev.map(s => 
        s.name === "Market Snapshot" 
          ? { 
              ...s, 
              status: "success",
              data: snapshotData.data
            }
          : s
      ));
    } catch (error) {
      setSources(prev => prev.map(s => 
        s.name === "Market Snapshot" 
          ? { ...s, status: "error", error: String(error) }
          : s
      ));
    }
  };

  useEffect(() => {
    testDataSources();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "mock":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Skeleton className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-700">✅ 真实数据</Badge>;
      case "mock":
        return <Badge className="bg-yellow-100 text-yellow-700">⚠️ 模拟数据</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-700">❌ 错误</Badge>;
      default:
        return <Badge variant="outline">⏳ 测试中...</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">数据源测试</h1>
        <p className="text-muted-foreground">验证所有数据源的连接状态</p>
      </div>

      <div className="flex gap-4">
        <Button onClick={testDataSources}>重新测试</Button>
      </div>

      <div className="grid gap-4">
        {sources.map((source) => (
          <Card key={source.name}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(source.status)}
                  <CardTitle className="text-lg">{source.name}</CardTitle>
                </div>
                {getStatusBadge(source.status)}
              </div>
            </CardHeader>
            <CardContent>
              {source.status === "loading" ? (
                <Skeleton className="h-16 w-full" />
              ) : source.error ? (
                <p className="text-sm text-red-600">{source.error}</p>
              ) : source.data ? (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(source.data, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">暂无数据</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>✅ 真实数据</strong> - 成功从API获取实时数据</p>
            <p><strong>⚠️ 模拟数据</strong> - API调用失败，使用本地模拟数据兜底</p>
            <p><strong>❌ 错误</strong> - 发生异常，需要检查配置</p>
            <p className="mt-4">如果所有数据源都显示&quot;模拟数据&quot;，请检查：</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>FRED_API_KEY 是否正确配置在 .env.local 中</li>
              <li>网络连接是否正常</li>
              <li>API 服务是否可用</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
