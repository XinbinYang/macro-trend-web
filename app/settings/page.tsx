"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Bell, Globe, Shield, User } from "lucide-react";

export default function SettingsPage() {
  const [theme, setTheme] = useState("system");
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    reportUpdates: true,
    marketNews: false,
  });
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [refreshInterval, setRefreshInterval] = useState("60");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground">个性化您的投资体验</p>
      </div>

      {/* 外观设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            外观设置
          </CardTitle>
          <CardDescription>自定义界面主题</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>主题模式</Label>
              <p className="text-sm text-muted-foreground">选择您喜欢的界面主题</p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择主题" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    浅色模式
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    深色模式
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    跟随系统
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 通知设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知设置
          </CardTitle>
          <CardDescription>管理您的通知偏好</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>价格预警</Label>
              <p className="text-sm text-muted-foreground">资产价格达到目标价位时通知</p>
            </div>
            <Switch 
              checked={notifications.priceAlerts}
              onCheckedChange={(checked) => setNotifications({...notifications, priceAlerts: checked})}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>报告更新</Label>
              <p className="text-sm text-muted-foreground">新报告发布时通知</p>
            </div>
            <Switch 
              checked={notifications.reportUpdates}
              onCheckedChange={(checked) => setNotifications({...notifications, reportUpdates: checked})}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>市场快讯</Label>
              <p className="text-sm text-muted-foreground">重要市场新闻实时推送</p>
            </div>
            <Switch 
              checked={notifications.marketNews}
              onCheckedChange={(checked) => setNotifications({...notifications, marketNews: checked})}
            />
          </div>
        </CardContent>
      </Card>

      {/* 投资偏好 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            投资偏好
          </CardTitle>
          <CardDescription>自定义您的投资策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>风险偏好</Label>
              <p className="text-sm text-muted-foreground">影响组合配置建议</p>
            </div>
            <Select value={riskProfile} onValueChange={setRiskProfile}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择风险偏好" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">保守型</SelectItem>
                <SelectItem value="balanced">平衡型</SelectItem>
                <SelectItem value="aggressive">激进型</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>数据刷新频率</Label>
              <p className="text-sm text-muted-foreground">自动刷新市场数据的间隔</p>
            </div>
            <Select value={refreshInterval} onValueChange={setRefreshInterval}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择刷新频率" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30秒</SelectItem>
                <SelectItem value="60">1分钟</SelectItem>
                <SelectItem value="300">5分钟</SelectItem>
                <SelectItem value="900">15分钟</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            关于
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
              AI宏观作手
            </h3>
            <p className="text-sm text-muted-foreground">全球宏观投资分析平台</p>
            <p className="text-xs text-muted-foreground mt-1">版本 1.0.0</p>
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            <p><strong>分析框架：</strong>周期分析 · 反身性理论 · 流动性分析 · 技术趋势</p>
            <p><strong>数据来源：</strong>Yahoo Finance · Finnhub · Polygon</p>
            <p><strong>AI模型：</strong>DeepSeek / Kimi / Claude</p>
          </div>
          <Separator />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              © 2026 AI宏观作手. All rights reserved.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button size="lg">
          保存设置
        </Button>
      </div>
    </div>
  );
}
