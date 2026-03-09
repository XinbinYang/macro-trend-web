import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/components/trpc-provider";
import { MobileNav, DesktopNav } from "@/components/navigation";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI宏观作手 - 全球宏观投资分析平台",
  description: "AI驱动的全球宏观投资分析平台，融合周期分析、反身性理论、流动性分析和技术趋势四大维度，为专业投资者提供实时市场数据、智能报告生成和资产配置建议。",
  keywords: ["宏观投资", "资产配置", "AI分析", "投资策略", "全球市场"],
  authors: [{ name: "AI宏观作手" }],
  openGraph: {
    title: "AI宏观作手 - 全球宏观投资分析平台",
    description: "AI驱动的全球宏观投资分析平台",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <TRPCProvider>
          <div className="relative flex min-h-screen flex-col bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 md:h-16 items-center justify-between">
                {/* Logo */}
                <a href="/" className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm md:text-base">AI</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base md:text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent leading-tight">
                      宏观作手
                    </span>
                    <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                      Global Macro Intelligence
                    </span>
                  </div>
                </a>

                {/* Desktop Navigation */}
                <DesktopNav />

                {/* Mobile Menu Button */}
                <MobileNav />
              </div>
            </header>
            
            {/* Main Content */}
            <main className="flex-1 container py-4 md:py-6 lg:py-8 px-4 md:px-6">
              {children}
            </main>
            
            {/* Footer */}
            <footer className="border-t bg-muted/30">
              <div className="container py-6 md:py-8 px-4 md:px-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">AI</span>
                    </div>
                    <span className="text-sm font-medium">AI宏观作手</span>
                  </div>
                  <p className="text-center text-xs md:text-sm text-muted-foreground">
                    © 2026 AI宏观作手 · 全球宏观投资分析平台 · 仅供参考，不构成投资建议
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Powered by</span>
                    <span className="font-medium">DeepSeek</span>
                    <span>·</span>
                    <span className="font-medium">GPT-5.4</span>
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
