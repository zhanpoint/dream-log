"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import "@/styles/ui/theme-toggle.css";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  // 避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="theme-toggle-btn"
        aria-label={t("settings.appearance.theme")}
      >
        <div className="theme-icon-container">
          <Sun className="h-3.5 w-3.5" />
        </div>
      </Button>
    );
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={t("settings.appearance.theme")}
    >
      <div className="theme-icon-container">
        {theme === "dark" ? (
          <Sun className="h-3.5 w-3.5" />
        ) : (
          <Moon className="h-3.5 w-3.5" />
        )}
      </div>
      <span className="sr-only">{t("settings.appearance.theme")}</span>
    </Button>
  );
}
