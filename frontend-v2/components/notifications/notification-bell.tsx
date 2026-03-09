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
import { zhCN } from "date-fns/locale";
import { Bell, CheckCheck, Inbox, Loader2, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // SSE 实时推送
  const { status } = useNotificationSSE({
    onNotification: (notification) => {
      const isDmNotification =
        notification.link?.startsWith("/community/messages") ||
        notification.title.includes("私信");

      // 收到新通知，显示 toast（私信类通知不弹提示，避免打扰）
      if (!isDmNotification) {
        toast.success(notification.title, {
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
          title={status === "connected" ? "通知 (实时推送已连接)" : "通知"}
        >
          <Bell className={cn(
            "h-[1.1rem] w-[1.1rem]",
            status === "connected" ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"
          )} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
              {badgeText}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        {/* 头部：左侧标题+状态，右侧查看全部+全部已读 */}
        <div className="flex items-center justify-between border-b px-4 py-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm font-semibold">通知</h4>
            {status === "connected" && (
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] text-muted-foreground">实时</span>
              </div>
            )}
            {status === "error" && (
              <span className="text-[10px] text-destructive">离线</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {notifications.length > 0 && (
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-primary hover:underline"
              >
                查看全部通知
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
                全部已读
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
              <p className="text-sm">暂无新通知</p>
              <p className="text-xs mt-1">开启洞察报告，获取梦境分析通知</p>
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
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground dark:text-foreground/70 mt-1">
                      {format(new Date(n.created_at), "M月d日 HH:mm", {
                        locale: zhCN,
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
