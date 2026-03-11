"use client";

import { SiteHeader } from "@/components/site-header";
import { AuthToken } from "@/lib/auth-api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authenticated = AuthToken.isAuthenticated();
    setIsAuthenticated(authenticated);

    if (!authenticated) {
      router.replace("/auth");
      return;
    }

    setReady(true);
  }, [router]);

  // 等待客户端鉴权检查，避免 SSR/CSR 不一致导致 hydration mismatch
  if (!ready || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>{children}</main>
    </div>
  );
}
