"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { User, Shield, Sparkles } from "lucide-react";

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
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200",
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
    </nav>
  );
}
