import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/components/trpc-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI宏观作手 - 全球宏观投资仪表盘",
  description: "AI驱动的全球宏观投资分析平台，融合周期分析、反身性理论、流动性分析和技术趋势四大维度",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <TRPCProvider>
          <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 items-center">
                <div className="mr-4 flex">
                  <a href="/" className="mr-6 flex items-center space-x-2">
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                      AI宏观作手
                    </span>
                  </a>
                  <nav className="flex items-center space-x-6 text-sm font-medium">
                    <a href="/" className="transition-colors hover:text-foreground/80 text-foreground">
                      仪表盘
                    </a>
                    <a href="/assets" className="transition-colors hover:text-foreground/80 text-foreground/60">
                      资产
                    </a>
                    <a href="/compare" className="transition-colors hover:text-foreground/80 text-foreground/60">
                      对比
                    </a>
                    <a href="/reports" className="transition-colors hover:text-foreground/80 text-foreground/60">
                      报告
                    </a>
                  </nav>
                </div>
              </div>
            </header>
            
            {/* Main Content */}
            <main className="container py-6">
              {children}
            </main>
            
            {/* Footer */}
            <footer className="border-t py-6 md:py-0">
              <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                  AI宏观作手 © 2026 - 全球宏观投资分析平台
                </p>
              </div>
            </footer>
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
