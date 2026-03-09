"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/node_modules/react-i18next";
import { User, Shield, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthHelpers } from "@/lib/auth-api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const menuItems = [
  {
    id: "profile",
    href: "/settings/profile",
    icon: User,
    labelKey: "settings.sidebar.profile",
  },
  {
    id: "account",
    href: "/settings/account",
    icon: Shield,
    labelKey: "settings.sidebar.account",
  },
  {
    id: "insights",
    href: "/settings/insights",
    icon: Sparkles,
    labelKey: "settings.sidebar.insights",
  },
];

export function SettingsSidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await AuthHelpers.handleLogout("/auth");
    } catch {
      toast.error("退出登录失败，请稍后重试");
    }
  };

  return (
    <nav className="space-y-1">
      <h2 className="mb-4 text-lg font-semibold">{t("settings.title")}</h2>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:translate-x-1"
            )}
          >
            <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="transition-opacity duration-200">{t(item.labelKey)}</span>
          </Link>
        );
      })}

      <div className="pt-4 mt-4 border-t border-border/60">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-auto min-w-[120px] justify-start gap-2.5 text-destructive border-destructive/30 bg-transparent hover:bg-transparent hover:text-destructive hover:border-destructive/50 hover:scale-[1.03] hover:shadow-md transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定要退出登录吗？</AlertDialogTitle>
              <AlertDialogDescription>
                退出后你需要重新登录才能继续使用完整功能。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认退出
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </nav>
  );
}
