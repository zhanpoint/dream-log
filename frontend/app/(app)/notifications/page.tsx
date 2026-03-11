"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  notificationAPI,
  type Notification,
} from "@/lib/notification-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { enUS, ja, zhCN } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const TYPE_ICONS: Record<string, string> = {
  MONTHLY_REPORT: "📊",
  WEEKLY_REPORT: "📅",
  ANNUAL_REPORT: "🌟",
};

const dateLocales: Record<string, Locale> = {
  en: enUS,
  "en-US": enUS,
  ja,
  "zh-CN": zhCN,
};

const dateFormats: Record<string, string> = {
  en: "MMM d, HH:mm",
  "en-US": "MMM d, HH:mm",
  ja: "M月d日 H:mm",
  "zh-CN": "M月d日 HH:mm",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.list({
        type: typeFilter,
        limit,
        offset,
      });
      setNotifications(res.items);
      setTotal(res.total);
    } catch {
      toast.error(t("notifications.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, offset, t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await notificationAPI.markAsRead(n.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, is_read: true } : item
        )
      );
    }
    if (n.link) router.push(n.link);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => t - 1);
      toast.success(t("notifications.deleteSuccess"));
    } catch {
      toast.error(t("notifications.deleteFailed"));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success(t("notifications.markAllReadSuccess"));
    } catch {
      toast.error(t("notifications.markAllReadFailed"));
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const dateLocale = useMemo<Locale>(
    () => dateLocales[i18n.language] ?? zhCN,
    [i18n.language]
  );
  const dateFormat = useMemo<string>(
    () => dateFormats[i18n.language] ?? "M月d日 HH:mm",
    [i18n.language]
  );

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

    if (/睡眠质量分析/.test(n.title)) {
      return t("notifications.sleepQualityAnalysisGenerated");
    }
    if (/情绪健康分析/.test(n.title)) {
      return t("notifications.emotionHealthAnalysisGenerated");
    }
    if (/主题模式分析|梦境主题模式|主题模式/.test(n.title)) {
      return t("notifications.themePatternAnalysisGenerated");
    }

    // 部分旧数据标题可能为中文固定格式：兜底解析
    const annualLegacy = n.title.match(/^(\d{4})年(?:度)?梦境(?:年报|回顾)已生成$/);
    if (annualLegacy) {
      return t("notifications.annualReportGenerated", { year: Number(annualLegacy[1]) });
    }

    return n.title;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部标题区 - 移除分割线 */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{t("notifications.title")}</h1>
          </div>
          {notifications.some(n => !n.is_read) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
      </div>

      {/* 通知列表 - 类似微信的列表设计 */}
      <div className="container mx-auto px-4 py-2">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4 border-b border-border/40">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 mx-auto rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t("notifications.emptyTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("notifications.emptyDescription")}
            </p>
          </div>
        ) : (
          <div>
            <AnimatePresence mode="popLayout">
              {notifications.map((n, index) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="group"
                >
                  <div
                    className={cn(
                      "relative px-4 py-4 cursor-pointer transition-colors hover:bg-muted/30 border-b border-border/40",
                      !n.is_read && "bg-primary/[0.02]"
                    )}
                    onClick={() => handleClick(n)}
                  >
                    {/* 未读指示器 */}
                    {!n.is_read && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                    )}
                    
                    <div className="flex items-start justify-between gap-3 pl-3">
                      <div className="flex-1 min-w-0">
                        {/* 标题 */}
                        <h3
                          className={cn(
                            "text-[15px] leading-tight mb-1.5",
                            !n.is_read ? "font-semibold text-foreground" : "text-foreground"
                          )}
                        >
                          {getTitle(n)}
                        </h3>
                        
                        {/* 时间 */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(n.created_at), dateFormat, {
                              locale: dateLocale,
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {/* 删除按钮 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent"
                        onClick={(e) => handleDelete(e, n.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setOffset(offset - limit)}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setOffset(offset + limit)}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
