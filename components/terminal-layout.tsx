"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  PieChart,
  FileText,
  Settings,
  Search,
  Bell,
  User,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard, shortLabel: "首页" },
  { href: "/assets", label: "资产行情", icon: TrendingUp, shortLabel: "资产" },
  { href: "/portfolio", label: "组合分析", icon: PieChart, shortLabel: "组合" },
  { href: "/compare", label: "资产对比", icon: BarChart3, shortLabel: "对比" },
  { href: "/reports", label: "研究报告", icon: FileText, shortLabel: "报告" },
  { href: "/settings", label: "设置", icon: Settings, shortLabel: "设置" },
];

export function TerminalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-terminal-bg">
      {/* 桌面端左侧导航栏 */}
      <aside className="hidden lg:flex nav-terminal w-60 flex-shrink-0 flex-col border-r border-terminal-border">
        {/* Logo 区域 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-terminal-border">
          <div className="w-8 h-8 bg-signal-cyan rounded flex items-center justify-center flex-shrink-0">
            <span className="text-terminal-bg font-bold text-sm">AI</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-text-primary truncate">宏观作手</span>
            <span className="text-2xs text-text-muted">Macro Trader</span>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="px-3 py-2 border-b border-terminal-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="搜索资产..."
              className="w-full bg-terminal-bg-tertiary border border-terminal-border rounded px-7 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-signal-cyan"
            />
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <div className="px-3 mb-2 text-2xs text-text-muted uppercase tracking-wider">
            主导航
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "text-signal-cyan bg-terminal-bg-tertiary border-l-2 border-signal-cyan"
                    : "text-text-secondary hover:text-text-primary hover:bg-terminal-bg-tertiary"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 底部用户信息 */}
        <div className="border-t border-terminal-border p-3">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">杨总</span>
          </div>
        </div>
      </aside>

      {/* 移动端侧边栏遮罩 */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 移动端侧边栏抽屉 */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full w-64 nav-terminal z-50 transform transition-transform duration-300 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* 关闭按钮 */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-signal-cyan rounded flex items-center justify-center">
              <span className="text-terminal-bg font-bold text-sm">AI</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">宏观作手</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 移动端导航 */}
        <nav className="py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-base transition-colors ${
                  isActive
                    ? "text-signal-cyan bg-terminal-bg-tertiary border-l-2 border-signal-cyan"
                    : "text-text-secondary hover:text-text-primary hover:bg-terminal-bg-tertiary"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* 顶部栏 - 桌面端 */}
        <header className="hidden lg:flex h-12 bg-terminal-bg-secondary border-b border-terminal-border items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">
              {new Date().toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </span>
            <span className="text-xs text-signal-cyan">
              市场状态: 交易中
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-data-up">美股 ↑ 0.85%</span>
              <span className="text-data-down">A股 ↓ 0.32%</span>
              <span className="text-data-up">黄金 ↑ 1.25%</span>
            </div>
          </div>
        </header>

        {/* 顶部栏 - 移动端 */}
        <header className="lg:hidden h-14 bg-terminal-bg-secondary border-b border-terminal-border flex items-center justify-between px-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-text-secondary hover:text-text-primary"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-signal-cyan rounded flex items-center justify-center">
                <span className="text-terminal-bg font-bold text-xs">AI</span>
              </div>
              <span className="text-sm font-semibold text-text-primary">宏观作手</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-text-muted hover:text-text-primary">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto p-3 lg:p-4 bg-terminal-bg pb-20 lg:pb-4">
          {children}
        </main>

        {/* 移动端底部导航 */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-terminal-bg-secondary border-t border-terminal-border flex items-center justify-around z-30">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] ${
                  isActive ? "text-signal-cyan" : "text-text-muted"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-2xs">{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
