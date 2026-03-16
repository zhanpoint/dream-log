"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  notificationAPI,
  type Notification,
} from "@/lib/notification-api";
import { useNotificationSSE } from "@/lib/use-notification-sse";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { enUS, ja, zhCN } from "date-fns/locale";
import { Bell, CheckCheck, Inbox, Loader2, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const dateLocales: Record<string, Locale> = { en: enUS, "en-US": enUS, ja, cn: zhCN };
const dateFormats: Record<string, string> = {
  en: "MMM d, HH:mm",
  "en-US": "MMM d, HH:mm",
  ja: "M月d日 H:mm",
  cn: "M月d日 HH:mm",
};

export function NotificationBell() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocales[i18n.language] ?? zhCN;
  const dateFormat = dateFormats[i18n.language] ?? "M月d日 HH:mm";
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const getTitle = (n: Notification) => {
    if (n.type === "MONTHLY_REPORT") {
      const metadata = n.metadata_ ?? {};
      const year = (metadata as { year?: number }).year ?? new Date(n.created_at).getFullYear();
      const month = (metadata as { month?: number }).month ?? new Date(n.created_at).getMonth() + 1;
      return t("notifications.monthlyReportGenerated", { year, month });
    }

    if (n.type === "WEEKLY_REPORT") {
      return t("notifications.weeklyReportGenerated");
    }

    if (n.type === "ANNUAL_REPORT") {
      const metadata = n.metadata_ ?? {};
      const yearFromMeta = (metadata as { year?: number }).year;
      const yearFromTitle = n.title.match(/(\d{4})/);
      const year = yearFromMeta ?? (yearFromTitle ? Number(yearFromTitle[1]) : new Date(n.created_at).getFullYear());
      return t("notifications.annualReportGenerated", { year });
    }

    const dmMatch = n.title.match(/^(.+?) 给你发了私信$/);
    if (dmMatch) {
      return t("notifications.sentYouDm", { name: dmMatch[1] });
    }

    if (n.metadata_?.report_type === "SLEEP_QUALITY") {
      return t("notifications.sleepQualityAnalysisGenerated");
    }
    if (n.metadata_?.report_type === "EMOTION_HEALTH") {
      return t("notifications.emotionHealthAnalysisGenerated");
    }
    if (n.metadata_?.report_type === "THEME_PATTERN") {
      return t("notifications.themePatternAnalysisGenerated");
    }

    const annualLegacy = n.title.match(/^(\d{4})年(?:度)?梦境(?:年报|回顾)已生成$/);
    if (annualLegacy) {
      return t("notifications.annualReportGenerated", { year: Number(annualLegacy[1]) });
    }

    return n.title;
  };

  // SSE 实时推送
  const { status } = useNotificationSSE({
    onNotification: (notification) => {
      const isDmNotification =
        notification.link?.startsWith("/community/messages") ||
        / 给你发了私信$/.test(notification.title);

      // 收到新通知，显示 toast（私信类通知不弹提示，避免打扰）
      if (!isDmNotification) {
        toast.success(getTitle(notification), {
          description: notification.content || undefined,
          duration: 4000,
        });
      }

      // 如果弹窗打开，更新通知列表
      if (open) {
        setNotifications((prev) => [notification, ...prev.slice(0, 4)]);
      }
    },
    onUnreadCountChange: (count) => {
      setUnreadCount(count);
    },
  });

  // 初始加载未读数
  useEffect(() => {
    const fetchInitialUnreadCount = async () => {
      try {
        const count = await notificationAPI.getUnreadCount();
        setUnreadCount(count);
      } catch {
        // 静默失败
      }
    };

    fetchInitialUnreadCount();
  }, []);

  // 打开时加载通知列表
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.list({ limit: 5 });
      setNotifications(res.items);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await notificationAPI.markAsRead(n.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, is_read: true } : item
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className="relative h-9 w-9 inline-flex items-center justify-center rounded-md hover:scale-110 transition-transform duration-200"
          title={
            status === "connected"
              ? t("notifications.tooltipConnected")
              : t("notifications.tooltip")
          }
        >
          <Bell className={cn(
            "h-[1.1rem] w-[1.1rem]",
            status === "connected" ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"
          )} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse [animation-duration:2.6s]">
              {badgeText}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        {/* 头部：左侧标题+状态，右侧查看全部+全部已读 */}
        <div className="flex items-center justify-between border-b px-4 py-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm font-semibold">
              {t("notifications.title")}
            </h4>
            {status === "connected" && (
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
            )}
            {status === "error" && (
              <span className="text-[10px] text-destructive">
                {t("notifications.statusOffline")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {notifications.length > 0 && (
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-primary hover:underline"
              >
                {t("notifications.viewAll")}
              </Link>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-foreground dark:text-slate-200 hover:text-foreground dark:hover:text-slate-100 transition-transform duration-200 hover:scale-105 hover:-translate-y-0.5 hover:bg-transparent"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("notifications.markAllRead")}
              </Button>
            )}
          </div>
        </div>

        {/* 列表 */}
        <div className="max-h-[320px] overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">{t("notifications.emptyTitle")}</p>
              <p className="text-xs mt-1">
                {t("notifications.emptyDescription")}
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b last:border-b-0",
                  "transition-colors duration-200 ease-out",
                  "hover:bg-muted/30 dark:hover:bg-white/[0.04]",
                  !n.is_read && "bg-accent/20"
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className={cn("flex-1 min-w-0", n.is_read && "ml-4")}>
                    <p
                      className={cn(
                        "text-sm line-clamp-1",
                        !n.is_read && "font-semibold"
                      )}
                    >
                      {getTitle(n)}
                    </p>
                    <p className="text-[11px] text-muted-foreground dark:text-foreground/70 mt-1">
                      {format(new Date(n.created_at), dateFormat, {
                        locale: dateLocale,
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
