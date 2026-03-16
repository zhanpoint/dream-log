"use client";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import type { User } from "@/lib/auth-api";
import { AuthHelpers, AuthToken, AuthUser as AuthUserStore } from "@/lib/auth-api";
import { Compass, MessageSquare, Moon, Sparkles, Users } from "lucide-react";
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncAuthState = () => {
      setIsAuthenticated(AuthToken.isAuthenticated());
      setCurrentUser(AuthUserStore.get());
    };

    syncAuthState();
    window.addEventListener("auth:user-updated", syncAuthState);
    return () => window.removeEventListener("auth:user-updated", syncAuthState);
  }, []);

  return (
    <>
      <header className="dream-navbar">
        <div className="navbar-container-wrapper">
          <div className="navbar-container">
            {/* 左侧：Logo + 导航 */}
            <div className="flex items-center gap-24">
              <div className="navbar-logo">
                <Link href="/" className="flex items-center gap-2">
                  <img src="/logo.jpg" alt="Dream Log" className="h-12 w-12" />
                  <span className="navbar-logo-text">Dream Log</span>
                </Link>
              </div>

              {/* 核心导航 */}
              {!isAuthPage && mounted && isAuthenticated && currentUser && (
                <nav className="hidden md:flex items-center gap-2">
                  <Link 
                    href="/dreams"
                    className={`nav-link ${pathname === '/dreams' ? 'active' : ''}`}
                  >
                    <Moon className="h-4 w-4" />
                    <span>{t("nav.myDreams")}</span>
                  </Link>
                  <Link 
                    href="/insights"
                    className={`nav-link ${pathname.startsWith('/insights') ? 'active' : ''}`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{t("nav.insights")}</span>
                  </Link>
                  <Link 
                    href="/exploration"
                    className={`nav-link ${pathname.startsWith('/exploration') ? 'active' : ''}`}
                  >
                    <Compass className="h-4 w-4" />
                    <span>{t("nav.exploration")}</span>
                  </Link>
                  <Link 
                    href="/community"
                    className={`nav-link ${pathname.startsWith('/community') ? 'active' : ''}`}
                  >
                    <Users className="h-4 w-4" />
                    <span>{t("nav.community")}</span>
                  </Link>
                </nav>
              )}
            </div>

            {/* 右侧：工具 + 用户操作 */}
            <div className="navbar-tools">
            {/* 桌面端工具 */}
            <div className="navbar-tools-desktop">
              <LanguageSelector />
              <ThemeToggle />
            </div>

            {/* 认证状态显示 */}
            {!isAuthPage && mounted && (
              <>
                {isAuthenticated && currentUser ? (
                  <>
                    <Link href="/dreams/new">
                      <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1.5 record-dream-btn">
                        <svg 
                          className="h-4 w-4" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        {t("nav.recordDream")}
                      </Button>
                    </Link>
                    <Link
                      href="/community/messages"
                      className="relative h-9 w-9 inline-flex items-center justify-center rounded-md hover:scale-110 transition-transform duration-200"
                      title={t("dm.header.title")}
                    >
                      <MessageSquare className="h-[1.1rem] w-[1.1rem] text-primary" />
                    </Link>
                    <NotificationBell />
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
                    <Link
                      href="/auth"
                      onClick={() => AuthHelpers.setPostLoginRedirect(pathname || "/")}
                    >
                      <Button variant="ghost" size="sm" className="login-btn">
                        {t("common.login")}
                      </Button>
                    </Link>
                    <Link
                      href="/auth"
                      onClick={() => AuthHelpers.setPostLoginRedirect(pathname || "/")}
                    >
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
        </div>
      </header>
    </>
  );
}
