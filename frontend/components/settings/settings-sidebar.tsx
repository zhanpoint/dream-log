"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CreditCard, User, Shield, Sparkles, Eye, LogOut, Trash2 } from "lucide-react";
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
    id: "billing",
    href: "/settings/billing",
    icon: CreditCard,
    labelKey: "settings.sidebar.billing",
  },
  {
    id: "insights",
    href: "/settings/insights",
    icon: Sparkles,
    labelKey: "settings.sidebar.insights",
  },
  {
    id: "privacy",
    href: "/settings/privacy",
    icon: Eye,
    labelKey: "settings.sidebar.privacy",
  },
  {
    id: "data",
    href: "/settings/data",
    icon: Trash2,
    labelKey: "settings.sidebar.data",
  },
];

type SettingsSidebarProps = {
  variant?: "sidebar" | "rail";
};

export function SettingsSidebar({
  variant = "sidebar",
}: SettingsSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isRail = variant === "rail";

  const handleLogout = async () => {
    try {
      await AuthHelpers.handleLogout("/auth");
    } catch {
      toast.error(t("settings.logout.error"));
    }
  };

  return (
    <nav className={cn(isRail ? "flex flex-col gap-3" : "flex flex-col gap-1")}>
      <h2 className={cn("text-lg font-semibold", isRail ? "px-1" : "mb-3")}>
        {t("settings.title")}
      </h2>
      <div
        className={cn(
          isRail
            ? "scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            : "flex flex-col gap-1"
        )}
      >
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "group rounded-lg transition-all duration-200",
              isRail
                ? "flex min-w-fit items-center gap-2 whitespace-nowrap border px-3 py-2"
                : "flex items-center gap-3 px-4 py-2.5",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : cn(
                    isRail
                      ? "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:translate-x-1"
                  )
            )}
          >
            <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
            <span className="transition-opacity duration-200">{t(item.labelKey)}</span>
          </Link>
        );
      })}
      </div>

      <div className={cn("border-border/60", isRail ? "pt-1" : "mt-4 border-t pt-4")}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "gap-2.5 border-destructive/30 bg-transparent text-destructive transition-all duration-200 hover:scale-[1.03] hover:border-destructive/50 hover:bg-transparent hover:text-destructive hover:shadow-md",
                isRail ? "w-full justify-center" : "w-auto min-w-[120px] justify-start"
              )}
            >
              <LogOut className="h-4 w-4" />
              {t("settings.logout.button")}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.logout.title")}</AlertDialogTitle>
              <AlertDialogDescription>{t("settings.logout.description")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("settings.logout.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </nav>
  );
}
