"use client";

import { SiteHeader } from "@/components/site-header";
import { AuthHelpers, AuthToken } from "@/lib/auth-api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authenticated = AuthToken.isAuthenticated();
    setIsAuthenticated(authenticated);

    if (!authenticated) {
      const query = searchParams.toString();
      const targetPath = query ? `${pathname}?${query}` : pathname;
      AuthHelpers.setPostLoginRedirect(targetPath);
      router.replace("/auth");
      return;
    }

    setReady(true);
  }, [router, pathname, searchParams]);

  // 等待客户端鉴权检查，避免 SSR/CSR 不一致导致 hydration mismatch
  if (!ready || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pb-24 md:pb-0">{children}</main>
    </div>
  );
}
