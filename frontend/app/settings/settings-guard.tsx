"use client";

import { SiteHeader } from "@/components/site-header";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { Button } from "@/components/ui/button";
import { AuthHelpers, AuthToken } from "@/lib/auth-api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function SettingsGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!AuthToken.isAuthenticated()) {
      const query = searchParams.toString();
      const targetPath = query ? `${pathname}?${query}` : pathname;
      AuthHelpers.setPostLoginRedirect(targetPath);
      router.push("/auth");
    } else {
      setIsLoading(false);
    }
  }, [router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="inline-block group">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 -ml-3 text-base hover:bg-transparent text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="transition-all duration-200 group-hover:tracking-wide">
                {t("auth.backToHome")}
              </span>
            </Button>
          </Link>
        </div>

        <div className="flex gap-8">
          <aside className="hidden md:block w-64 flex-shrink-0">
            <SettingsSidebar />
          </aside>

          <main className="flex-1 max-w-4xl">
            <div className="animate-in fade-in duration-200">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

