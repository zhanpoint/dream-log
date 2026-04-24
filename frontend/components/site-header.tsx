"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import type { User } from "@/lib/auth-api";
import { AuthHelpers, AuthToken, AuthUser as AuthUserStore } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import {
  Compass,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/styles/navbar.css";

const navigationItems = [
  { href: "/dreams", key: "nav.myDreams", icon: Moon, match: (pathname: string) => pathname === "/dreams" },
  { href: "/insights", key: "nav.insights", icon: Sparkles, match: (pathname: string) => pathname.startsWith("/insights") },
  { href: "/exploration", key: "nav.exploration", icon: Compass, match: (pathname: string) => pathname.startsWith("/exploration") },
  { href: "/community", key: "nav.community", icon: Users, match: (pathname: string) => pathname.startsWith("/community") },
] as const;

export function SiteHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");
  const menuLabel = "Menu";
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

  const showAuthenticatedShell = !isAuthPage && mounted && isAuthenticated && currentUser;
  const showGuestActions = !isAuthPage && mounted && !isAuthenticated;

  return (
    <>
      <header className="dream-navbar">
        <div className="navbar-container-wrapper">
          <div className="navbar-container">
            <div className="flex min-w-0 items-center gap-3 md:gap-6">
              <div className="navbar-logo">
                <Link href="/" className="flex items-center gap-2">
                  <img src="/logo.jpg" alt="Dream Log" className="h-12 w-12" />
                  <span className="navbar-logo-text">Dream Log</span>
                </Link>
              </div>

              {showAuthenticatedShell && (
                <nav className="hidden md:flex items-center gap-1">
                  {navigationItems.map(({ href, key, icon: Icon, match }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn("nav-link", match(pathname) && "active")}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{t(key)}</span>
                    </Link>
                  ))}
                </nav>
              )}
            </div>

            <div className="navbar-tools">
              <div className="navbar-tools-desktop">
                <LanguageSelector />
                <ThemeToggle />
              </div>

              {showAuthenticatedShell ? (
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
                    className="relative hidden h-9 w-9 items-center justify-center rounded-md transition-transform duration-200 hover:scale-110 sm:inline-flex"
                    title={t("dm.header.title")}
                  >
                    <MessageSquare className="h-[1.1rem] w-[1.1rem] text-primary" />
                  </Link>
                  <div className="hidden sm:block">
                    <NotificationBell />
                  </div>
                  <Link
                    href="/settings"
                    className="hidden items-center gap-2 rounded-lg px-2 py-1 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-80 sm:flex"
                    title={t("common.settings")}
                  >
                    <UserAvatar
                      userId={currentUser.id}
                      avatar={currentUser.avatar}
                      username={currentUser.username}
                      size="sm"
                    />
                    {currentUser.username && (
                      <span className="hidden text-sm font-medium lg:inline-block">
                        {currentUser.username}
                      </span>
                    )}
                  </Link>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="inline-flex md:hidden"
                        aria-label={menuLabel}
                      >
                        <Menu className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="mobile-menu-dialog top-auto bottom-0 translate-y-0 rounded-t-3xl border-x-0 border-b-0 px-0 pb-8 pt-0">
                      <DialogTitle className="sr-only">{menuLabel}</DialogTitle>
                      <DialogDescription className="sr-only">
                        {menuLabel}
                      </DialogDescription>
                      <div className="mobile-menu-sheet">
                        <div className="mobile-menu-handle" />
                        <div className="mobile-menu-section px-5 pt-3">
                          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-[oklch(var(--card)/0.9)] p-4 shadow-sm">
                            <UserAvatar
                              userId={currentUser.id}
                              avatar={currentUser.avatar}
                              username={currentUser.username}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {currentUser.username || "Dream Log"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {currentUser.email || t("common.settings")}
                              </p>
                            </div>
                            <Link href="/settings">
                              <Button variant="outline" size="sm" className="gap-2">
                                <Settings className="h-4 w-4" />
                                {t("common.settings")}
                              </Button>
                            </Link>
                          </div>
                        </div>

                        <div className="mobile-menu-section px-5 pt-4">
                          <p className="mobile-menu-label">{menuLabel}</p>
                          <div className="mobile-menu-grid">
                            {navigationItems.map(({ href, key, icon: Icon, match }) => (
                              <Link
                                key={href}
                                href={href}
                                className={cn("mobile-menu-card", match(pathname) && "mobile-menu-card-active")}
                              >
                                <Icon className="h-5 w-5" />
                                <span>{t(key)}</span>
                              </Link>
                            ))}
                          </div>
                        </div>

                        <div className="mobile-menu-section px-5 pt-4">
                          <p className="mobile-menu-label">{t("nav.recordDream")}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <Link href="/dreams/new">
                              <Button className="w-full gap-2">
                                <Plus className="h-4 w-4" />
                                {t("nav.recordDream")}
                              </Button>
                            </Link>
                            <Link href="/community/messages">
                              <Button variant="outline" className="w-full gap-2">
                                <MessageSquare className="h-4 w-4" />
                                {t("dm.header.title")}
                              </Button>
                            </Link>
                          </div>
                        </div>

                        <div className="mobile-menu-section mobile-menu-toolbar px-5 pt-4">
                          <LanguageSelector />
                          <ThemeToggle />
                          <NotificationBell />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : null}

              {showGuestActions ? (
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
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {showAuthenticatedShell ? (
        <nav className="mobile-bottom-nav" aria-label={menuLabel}>
          {navigationItems.map(({ href, key, icon: Icon, match }) => (
            <Link
              key={href}
              href={href}
              className={cn("mobile-bottom-link", match(pathname) && "mobile-bottom-link-active")}
            >
              <Icon className="h-4 w-4" />
              <span>{t(key)}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
