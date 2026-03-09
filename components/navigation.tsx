"use client";

import { useState } from "react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "仪表盘", icon: "📊" },
  { href: "/assets", label: "资产", icon: "📈" },
  { href: "/compare", label: "对比", icon: "⚖️" },
  { href: "/reports", label: "报告", icon: "📑" },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden p-2 rounded-lg hover:bg-accent"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t bg-background absolute top-full left-0 right-0">
          <nav className="container py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

export function DesktopNav() {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group relative px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="mr-1.5 opacity-70 group-hover:opacity-100">{item.icon}</span>
          {item.label}
          <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform" />
        </Link>
      ))}
    </nav>
  );
}
