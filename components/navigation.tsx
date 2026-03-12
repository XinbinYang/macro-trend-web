"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首页", icon: "🏠" },
  { href: "/mission", label: "中枢", icon: "🧭" },
  { href: "/macro", label: "宏观", icon: "🌍" },
  { href: "/assets", label: "资产", icon: "📊" },
  { href: "/compare", label: "对比", icon: "⚖️" },
  { href: "/reports", label: "报告", icon: "📑" },
  { href: "/academy", label: "学院", icon: "🎓" },
  { href: "/news", label: "资讯", icon: "📰" },
  { href: "/portfolio", label: "组合", icon: "💼" },
  { href: "/nav", label: "NAV", icon: "📈" },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Lock body scroll when drawer is open (prevents iOS “page moves behind menu” mess)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors relative z-[70]"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Navigation Drawer (overlay + right panel) */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/55"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-[78vw] max-w-[320px] bg-slate-950/98 backdrop-blur border-l border-slate-800 shadow-2xl overflow-y-auto">
            <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-200">导航</div>
              <button
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="p-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? "text-amber-400 bg-slate-800/50"
                        : "text-slate-400 hover:text-slate-50 hover:bg-slate-800/30"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 bg-amber-400 rounded-full"></span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
              isActive 
                ? "text-amber-400 bg-slate-800/50" 
                : "text-slate-400 hover:text-slate-50 hover:bg-slate-800/30"
            }`}
          >
            <span className="mr-2 opacity-80">{item.icon}</span>
            {item.label}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"></span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
