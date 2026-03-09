"use client";

import { cn } from "@/lib/utils";

export const DREAMER_LEVELS: Record<
  number,
  { title: string; titleEn: string; color: string; bg: string; border: string; glow: string; emoji: string }
> = {
  1: {
    title: "初入梦境",
    titleEn: "Dream Newcomer",
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-600",
    glow: "",
    emoji: "🌙",
  },
  2: {
    title: "梦境探索者",
    titleEn: "Dream Explorer",
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-900/30",
    border: "border-sky-300 dark:border-sky-600",
    glow: "shadow-sky-200 dark:shadow-sky-900",
    emoji: "🔭",
  },
  3: {
    title: "筑梦师",
    titleEn: "Dream Weaver",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/30",
    border: "border-violet-300 dark:border-violet-600",
    glow: "shadow-violet-200 dark:shadow-violet-900",
    emoji: "✨",
  },
  4: {
    title: "梦境守护者",
    titleEn: "Dream Guardian",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    border: "border-amber-300 dark:border-amber-500",
    glow: "shadow-amber-200 dark:shadow-amber-900",
    emoji: "🛡️",
  },
  5: {
    title: "梦境大师",
    titleEn: "Dream Master",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30",
    border: "border-orange-400 dark:border-orange-500",
    glow: "shadow-orange-300 dark:shadow-orange-800",
    emoji: "👑",
  },
};

interface DreamerLevelBadgeProps {
  level: number;
  title?: string | null;
  showTitle?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function DreamerLevelBadge({
  level,
  title,
  showTitle = false,
  size = "sm",
  className,
}: DreamerLevelBadgeProps) {
  if (!level || level < 1) return null;

  const levelInfo = DREAMER_LEVELS[level] ?? DREAMER_LEVELS[1];
  const displayTitle = title ?? levelInfo.title;

  const sizeClasses = {
    xs: "text-[9px] px-2.5 py-px",
    sm: "text-[10px] px-3 py-px",
    md: "text-xs px-3.5 py-0.5",
    lg: "text-sm px-4 py-1",
  };

  const neutralStyle =
    "text-primary bg-primary/5 border border-primary/35 shadow-none dark:text-primary-foreground dark:bg-primary/15 dark:border-primary/45";

  if (showTitle) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-semibold border transition-all duration-200",
          sizeClasses[size],
          neutralStyle,
          className
        )}
      >
        <span>Lv{level}</span>
        <span className="opacity-80">· {displayTitle}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold border transition-all duration-200",
        sizeClasses[size],
        neutralStyle,
        className
      )}
      title={displayTitle}
    >
      <span>Lv{level}</span>
    </span>
  );
}

interface InspirationPointsBadgeProps {
  points: number;
  className?: string;
  size?: "xs" | "sm" | "md";
}

export function InspirationPointsBadge({ points, className, size = "sm" }: InspirationPointsBadgeProps) {
  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5",
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold border",
        "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
        "text-amber-600 dark:text-amber-400",
        "border-amber-200 dark:border-amber-700",
        sizeClasses[size],
        className
      )}
    >
      <span>✦</span>
      <span>{points.toLocaleString()}</span>
      <span className="opacity-70">灵感值</span>
    </span>
  );
}
