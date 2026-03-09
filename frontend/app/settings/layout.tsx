"use client";

import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { SiteHeader } from "@/components/site-header";
import { AuthToken } from "@/lib/auth-api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/node_modules/react-i18next";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 检查认证状态
    if (!AuthToken.isAuthenticated()) {
      router.push("/auth");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 保留导航栏 */}
      <SiteHeader />

      <div className="container mx-auto px-4 py-8">
        {/* 返回首页按钮 */}
        <div className="mb-6">
          <Link href="/" className="inline-block group">
            <Button variant="ghost" size="sm" className="gap-2 -ml-3 text-base hover:bg-transparent text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="transition-all duration-200 group-hover:tracking-wide">{t("auth.backToHome")}</span>
            </Button>
          </Link>
        </div>

        <div className="flex gap-8">
          <aside className="hidden md:block w-64 flex-shrink-0">
            <SettingsSidebar />
          </aside>

          <main className="flex-1 max-w-4xl">
            <div className="animate-in fade-in duration-200">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
