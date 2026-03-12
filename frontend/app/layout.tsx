import { I18nProvider } from "@/components/i18n-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { RouteProgress } from "@/components/ui/route-progress";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dream Log - 梦境日志",
  description: "记录和探索你的梦境世界，使用 AI 技术分析梦境，发现隐藏的模式和意义",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn("min-h-screen bg-background font-sans antialiased")}
      >
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="dream-log-theme"
          >
            <div className="min-h-screen w-full">
              <Suspense fallback={null}>
                <RouteProgress />
              </Suspense>
              {children}
              <Toaster />
            </div>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
