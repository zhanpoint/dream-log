"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import "@/styles/ui/theme-toggle.css";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

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
        aria-label="切换主题"
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
      aria-label="切换主题"
    >
      <div className="theme-icon-container">
        {theme === "dark" ? (
          <Sun className="h-3.5 w-3.5" />
        ) : (
          <Moon className="h-3.5 w-3.5" />
        )}
      </div>
      <span className="sr-only">切换主题</span>
    </Button>
  );
}
