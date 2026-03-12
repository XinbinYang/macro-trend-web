import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/components/trpc-provider";
import { MobileNav, DesktopNav } from "@/components/navigation";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "AI宏观作手 | Global Macro Intelligence",
  description: "AI驱动的全球宏观投资分析平台，融合周期分析、反身性理论、流动性分析和技术趋势四大维度，为专业投资者提供实时市场数据、智能报告生成和资产配置建议。",
  keywords: ["宏观投资", "资产配置", "AI分析", "投资策略", "全球市场", "对冲基金"],
  authors: [{ name: "AI宏观作手" }],
  openGraph: {
    title: "AI宏观作手 | Global Macro Intelligence",
    description: "AI驱动的全球宏观投资分析平台",
    type: "website",
  },
  other: {
    "build-time": new Date().toISOString(),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSerif.variable} font-sans antialiased`}>
        <TRPCProvider>
          <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
              <div className="container flex h-14 md:h-16 items-center justify-between">
                {/* Logo */}
                <a href="/" className="flex items-center gap-2.5 md:gap-3">
                  <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <span className="text-slate-950 font-bold text-sm md:text-base">AI</span>
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-slate-950"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-base md:text-lg font-bold text-slate-50 leading-tight tracking-wide">
                      宏观作手
                    </span>
                    <span className="text-[10px] md:text-[11px] text-slate-400 font-medium tracking-wider uppercase">
                      Global Macro Intelligence
                    </span>
                  </div>
                </a>

                {/* Desktop Navigation */}
                <DesktopNav />

                {/* Mobile: use bottom nav; hide top-right hamburger to reduce clutter */}
                <div className="hidden md:block">
                  <MobileNav />
                </div>
              </div>
            </header>
            
            {/* Main Content */}
            <main className="flex-1 container py-4 md:py-6 lg:py-8 px-4 md:px-6 min-h-0">
              {children}
            </main>
            
            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur border-t border-slate-800" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              <div className="flex items-center justify-around h-14">
                {[
                  { href: "/", label: "首页", icon: "🏠" },
                  { href: "/mission", label: "中枢", icon: "🧭" },
                  { href: "/macro", label: "宏观", icon: "🌍" },
                  { href: "/assets", label: "资产", icon: "📊" },
                  { href: "/reports", label: "报告", icon: "📑" },
                  { href: "/portfolio", label: "组合", icon: "💼" },
                ].map((item, index) => (
                  <a
                    key={`nav-${index}-${item.href}`}
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 text-xs text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px]">{item.label}</span>
                  </a>
                ))}
              </div>
            </nav>
            
            {/* Footer */}
            <footer className="border-t border-slate-800 bg-slate-950 pb-20 md:pb-6">
              <div className="container py-4 md:py-6 px-4 md:px-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                      <span className="text-slate-950 font-bold text-[10px]">AI</span>
                    </div>
                    <span className="text-xs font-serif font-bold text-slate-50">宏观作手</span>
                  </div>
                  <p className="text-center text-[10px] text-slate-500">
                    © 2026 AI宏观作手 · 仅供参考，不构成投资建议
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                      实时
                    </span>
                    <span>·</span>
                    <span>DeepSeek</span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
