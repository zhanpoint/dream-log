"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  PlusCircle,
  Search,
  Users,
  MoonStar,
  Skull,
  BrainCircuit,
  HeartHandshake,
  Orbit,
  Stars,
  Compass,
  Film,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { communityAPI, type CommunityResponse } from "@/lib/community-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface GreenhouseShellProps {
  activeSlug?: string;
  header?: React.ReactNode;
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreateCommunity?: () => void;
}

export function GreenhouseShell({
  activeSlug,
  header,
  rightPanel,
  children,
  searchValue,
  onSearchChange,
  onCreateCommunity,
}: GreenhouseShellProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<CommunityResponse[]>([]);
  const [recent, setRecent] = useState<CommunityResponse[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [joinedExpanded, setJoinedExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);

  const search = searchValue ?? "";
  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  useEffect(() => {
    communityAPI.getGreenhouseSidebar()
      .then((res) => {
        setJoined(res.joined ?? []);
        setRecent(res.recent ?? []);
      })
      .catch(() => {
        setJoined([]);
        setRecent([]);
      })
      .finally(() => setLoading(false));
  }, []);


  const iconForCommunity = (slug: string) => {
    const iconClass = "h-4.5 w-4.5 text-emerald-600 dark:text-emerald-300";
    const iconBySlug: Record<string, React.ReactNode> = {
      lucid_dreaming: <MoonStar className={iconClass} />,
      nightmare_support: <Skull className={iconClass} />,
      "nightmare-support": <Skull className={iconClass} />,
      symbolism_lab: <BrainCircuit className={iconClass} />,
      beginner_corner: <Sparkles className={iconClass} />,
      emotional_healing: <HeartHandshake className={iconClass} />,
      exploration_club: <Compass className={iconClass} />,
      "serial-dreams": <Film className={iconClass} />,
      "fun-dreams-share": <Stars className={iconClass} />,
      "parallel-world-dreams": <Orbit className={iconClass} />,
    };

    return iconBySlug[slug] ?? <MoonStar className={iconClass} />;
  };

  const renderCommunityItem = (community: CommunityResponse, highlight?: boolean) => (
    <Link
      key={community.id}
      href={`/community/greenhouse/${community.slug}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all",
        highlight
          ? "border-emerald-400/60 bg-emerald-50/60 text-emerald-900 dark:border-emerald-400/60 dark:bg-emerald-950/35 dark:text-emerald-100"
          : "border-transparent hover:border-emerald-300/60 hover:bg-emerald-50/30 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-950/25"
      )}
    >
      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        {iconForCommunity(community.slug)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{community.name}</p>
      </div>
      {highlight ? <ChevronRight className="h-4 w-4 text-emerald-500" /> : null}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4 lg:px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/community"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-emerald-500/10 hover:scale-110 active:scale-95"
            aria-label={t("community.greenhouse.shell.backToCommunity")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">
              {t("community.greenhouse.shell.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("community.greenhouse.shell.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          <aside
            className={cn(
              "rounded-2xl border border-emerald-500/15 bg-transparent backdrop-blur-sm p-4 transition-all",
              collapsed ? "lg:w-[84px]" : "lg:w-[280px]",
              "w-full"
            )}
          >
            <div className="flex items-center justify-between">
              <div className={cn("flex items-center gap-2", collapsed && "lg:justify-center")}
              >
                <LayoutGrid className="h-4 w-4 text-emerald-500" />
                {!collapsed && (
                  <p className="text-sm font-semibold">
                    {t("community.greenhouse.shell.navTitle")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:text-foreground hover:bg-emerald-500/10 hover:scale-110 active:scale-95"
                aria-label={
                  collapsed
                    ? t("community.greenhouse.shell.expandSidebar")
                    : t("community.greenhouse.shell.collapseSidebar")
                }
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            {!collapsed && (
              <div className="mt-4 space-y-4">
                <div className="relative">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={t("community.greenhouse.shell.searchPlaceholder")}
                    className="pl-9"
                  />
                </div>

                {onCreateCommunity && (
                  <button
                    type="button"
                    onClick={onCreateCommunity}
                    className="flex w-full items-center gap-2 rounded-xl border border-dashed border-emerald-400/50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-all hover:border-emerald-500/70 hover:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-400/15"
                  >
                    <PlusCircle className="h-4 w-4" />
                    {t("community.greenhouse.shell.createCommunity")}
                  </button>
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setJoinedExpanded((v) => !v)}
                    className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
                  >
                    <span>{t("community.greenhouse.shell.joinedSection")}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 text-muted-foreground transition-transform", joinedExpanded ? "rotate-180" : "rotate-0")}
                    />
                  </button>
                  {joinedExpanded ? (
                    loading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full rounded-xl" />
                        ))}
                      </div>
                    ) : joined.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                        {t("community.greenhouse.shell.emptyJoined")}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-hidden rounded-xl">
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {joined.map((c) => renderCommunityItem(c, c.slug === activeSlug))}
                        </div>
                      </div>
                    )
                  ) : null}
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setRecentExpanded((v) => !v)}
                    className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
                  >
                    <span>{t("community.greenhouse.shell.recentSection")}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 text-muted-foreground transition-transform", recentExpanded ? "rotate-180" : "rotate-0")}
                    />
                  </button>
                  {recentExpanded ? (
                    loading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full rounded-xl" />
                        ))}
                      </div>
                    ) : recent.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                        {t("community.greenhouse.shell.emptyRecent")}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-hidden rounded-xl">
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {recent.map((c) => renderCommunityItem(c, c.slug === activeSlug))}
                        </div>
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            )}
          </aside>

          <main className="flex-1 min-w-0">
            {header}
            <div className="space-y-4">
              {children}
            </div>
          </main>

          <aside className="hidden xl:block w-[320px] flex-shrink-0">
            {rightPanel}
          </aside>
        </div>
      </div>
    </div>
  );
}
