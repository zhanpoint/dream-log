"use client";

import { SiteHeader } from "@/components/site-header";
import { AuthToken } from "@/lib/auth-api";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const checked = useRef(false);

  // 同步检查 token（localStorage 是同步的，不需要 useState + useEffect 的两阶段渲染）
  const isAuthenticated = typeof window !== "undefined" ? AuthToken.isAuthenticated() : true;

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (!AuthToken.isAuthenticated()) {
      router.replace("/auth");
    }
  }, [router]);

  // 未登录时不渲染内容，跳转由 useEffect 处理
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>{children}</main>
    </div>
  );
}
