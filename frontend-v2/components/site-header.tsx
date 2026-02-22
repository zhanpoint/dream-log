"use client";

import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { AuthToken, AuthUser } from "@/lib/auth-api";
import { Moon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/styles/navbar.css";

export function SiteHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const updateAuthState = () => {
      const authenticated = AuthToken.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        setCurrentUser(AuthUser.get());
      }
    };

    // 处理用户更新事件：始终读取最新用户信息
    const handleUserUpdated = () => {
      setCurrentUser(AuthUser.get());
    };

    updateAuthState();

    // 监听用户信息更新事件
    window.addEventListener("auth:user-updated", handleUserUpdated);
    return () => window.removeEventListener("auth:user-updated", handleUserUpdated);
  }, [pathname]);

  return (
    <>
      <header className="dream-navbar">
        <div className="navbar-container">
          {/* Logo */}
          <div className="navbar-logo">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Dream Log" className="h-12 w-12" />
              <span className="navbar-logo-text">Dream Log</span>
            </Link>
          </div>

          {/* 用户工具栏 */}
          <div className="navbar-tools">
            {/* 桌面端工具 */}
            <div className="navbar-tools-desktop">
              <LanguageSelector />
              <ThemeToggle />
            </div>

            {/* 认证状态显示 */}
            {!isAuthPage && (
              <>
                {isAuthenticated && currentUser ? (
                  <>
                    <Link href="/dreams">
                      <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1.5">
                        <Moon className="h-4 w-4" />
                        我的梦境
                      </Button>
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-200 hover:opacity-80 hover:-translate-y-0.5"
                      title={t("common.settings")}
                    >
                    <UserAvatar
                      userId={currentUser.id}
                      avatar={currentUser.avatar}
                      username={currentUser.username}
                      size="sm"
                    />
                    {currentUser.username && (
                      <span className="text-sm font-medium hidden sm:inline-block">
                        {currentUser.username}
                      </span>
                    )}
                  </Link>
                  </>
                ) : (
                  <div className="auth-buttons">
                    <Link href="/auth">
                      <Button variant="ghost" size="sm" className="login-btn">
                        {t("common.login")}
                      </Button>
                    </Link>
                    <Link href="/auth">
                      <Button size="sm" className="register-btn">
                        {t("common.register")}
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
