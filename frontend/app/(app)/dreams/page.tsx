"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as DateRangeCalendar } from "@/components/ui/calendar";
import {
  DREAM_TYPES,
  DREAM_TYPE_ICON_MAP,
  DREAM_TYPE_LABEL_MAP,
  EMOTION_COLOR_MAP,
  EMOTION_CATEGORIES,
} from "@/lib/constants";
import {
  DreamApi,
  type DreamListItem,
  type DreamListParams,
  type DreamStats,
} from "@/lib/dream-api";
import { cn, getHighlightSegments } from "@/lib/utils";
import { getEmotionLabel } from "@/lib/emotion-utils";
import { format } from "date-fns";
import { zhCN, ja, enUS } from "date-fns/locale";
import type { DayPickerLocale } from "react-day-picker";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CalendarRange,
  Check,
  ChevronDown,
  Eye,
  Flame,
  Globe,
  Loader2,
  Lock,
  Moon,
  Plus,
  Search,
  Sparkles,
  Star,
  Edit,
  Trash2,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function MyDreamsPage() {
  const { t, i18n } = useTranslation();
  const [dreams, setDreams] = useState<DreamListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DreamStats | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("dream_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [dreamTypeFilter, setDreamTypeFilter] = useState<string[]>([]);
  const [emotionFilter, setEmotionFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const pageSize = 12;

  /** 情绪选项扁平列表（用于筛选，memo 避免每次渲染重算） */
  const emotionOptions = EMOTION_CATEGORIES.flatMap((c) => c.emotions);

  const fetchDreams = useCallback(async () => {
    setLoading(true);
    try {
      const params: DreamListParams = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        search: search.trim() || undefined,
        is_favorite: favoriteOnly || undefined,
        dream_type: dreamTypeFilter.length ? dreamTypeFilter.join(",") : undefined,
        emotion: emotionFilter.length ? emotionFilter.join(",") : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };
      // 并行加载梦境列表和统计数据，两个请求同时发出
      const [res] = await Promise.all([
        DreamApi.list(params),
        stats === null ? DreamApi.getStats().then(setStats).catch(() => {}) : Promise.resolve(),
      ]);
      setDreams(res.items);
      setTotal(res.total);
    } catch {
      toast.error(t("dreams.list.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, search, favoriteOnly, dreamTypeFilter, emotionFilter, dateFrom, dateTo, stats]);

  useEffect(() => {
    fetchDreams();
  }, [fetchDreams]);

  // 搜索防抖
  const [searchInput, setSearchInput] = useState("");
  // 搜索历史（最近 10 条，localStorage）
  const SEARCH_HISTORY_KEY = "dream-search-history";
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const addSearchToHistory = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setSearchHistory((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, 10);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeSearchFromHistory = useCallback((term: string) => {
    setSearchHistory((prev) => {
      const next = prev.filter((x) => x !== term);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleFavorite = async (
    e: React.MouseEvent,
    dreamId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await DreamApi.toggleFavorite(dreamId);
      setDreams((prev) =>
        prev.map((d) =>
          d.id === dreamId ? { ...d, is_favorite: res.is_favorite } : d,
        ),
      );
    } catch {
      toast.error("操作失败");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen">
      {/* 标题 + 统计 */}
      <div className="mt-4">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{t("dreams.list.title")}</h1>
            
            {/* 统计数据 */}
            <div className="flex flex-wrap items-center gap-8">
              {/*
                统计优先使用后端 /dreams/stats 返回的数据：
                - total: 全部梦境数量
                - consecutive_days: 连续记录天数
                - this_week_count: 本周记录
                - this_month_count: 本月记录
                如果 stats 还未加载，则回退为 0（total 则回退为分页 total）。
              */}

              {/* 全部梦境 */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Moon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none tabular-nums">
                    {stats?.total ?? total}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("dreams.list.statsTotal")}
                  </p>
                </div>
              </div>

              {/* 连续记录天数 */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none tabular-nums">
                    {stats?.consecutive_days ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("dreams.list.statsStreak")}
                  </p>
                </div>
              </div>

              {/* 本周记录数 */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none tabular-nums">
                    {stats?.this_week_count ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("dreams.list.statsWeek")}
                  </p>
                </div>
              </div>

              {/* 本月记录数 */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none tabular-nums">
                    {stats?.this_month_count ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("dreams.list.statsMonth")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索与过滤栏 */}
      <div className="sticky top-0 z-40 bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap flex-1">
            <div className="relative w-full sm:w-80 md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("dreams.list.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const term = searchInput.trim();
                    if (term) addSearchToHistory(term);
                    setSearchOpen(false);
                  }
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
                className="pl-10 h-10"
              />
              {searchOpen && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 py-1 rounded-lg border bg-popover shadow-lg z-50 backdrop-blur-sm">
                  <p className="px-3 py-1.5 text-xs text-muted-foreground">{t("dreams.list.recentSearch")}</p>
                  {searchHistory.map((term, i) => (
                    <div
                      key={`${term}-${i}`}
                      className="group relative flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
                    >
                      <button
                        type="button"
                        className="flex-1 text-left text-sm truncate"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchInput(term);
                          setSearch(term);
                          setPage(1);
                          setSearchOpen(false);
                        }}
                      >
                        {term}
                      </button>
                      <button
                        type="button"
                        className="shrink-0 transition-all invisible group-hover:visible text-muted-foreground hover:text-red-500"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeSearchFromHistory(term);
                        }}
                        title={t("dreams.list.delete")}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Select
              value={`${sortBy}_${sortOrder}`}
              onValueChange={(v) => {
                // 解析格式：dream_date_asc -> ["dream_date", "asc"]
                const parts = v.split("_");
                const order = parts[parts.length - 1]; // 最后一部分是排序方向
                const by = parts.slice(0, -1).join("_"); // 前面的部分重新组合为排序字段
                setSortBy(by);
                setSortOrder(order);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 h-10 group/select text-foreground hover:bg-primary/10 hover:border-primary/50 hover:text-primary hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                <div className="flex items-center gap-1.5">
                  <span 
                    className="text-base leading-none text-muted-foreground group-hover/select:text-primary transition-colors font-medium" 
                    aria-hidden
                  >
                    ⇅
                  </span>
                  <SelectValue placeholder="排序" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dream_date_desc">{t("dreams.list.sortNewest")}</SelectItem>
                <SelectItem value="dream_date_asc">{t("dreams.list.sortOldest")}</SelectItem>
              </SelectContent>
            </Select>

            {/* 日期范围（按用户习惯：排序后先选时间） */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className={cn(
                    "group/filter h-10 gap-1.5 transition-all duration-200 text-foreground",
                    "hover:bg-primary/10 hover:border-primary/50 hover:text-primary hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                    (dateFrom || dateTo) && "border-primary/50 bg-primary/5"
                  )}
                >
                  <CalendarRange className="w-3.5 h-3.5 shrink-0 transition-colors group-hover/filter:text-primary" />
                  {dateFrom || dateTo ? (
                    <span className="text-sm">
                      {dateFrom ? format(new Date(dateFrom), "M/d", { locale: zhCN }) : "…"} — {dateTo ? format(new Date(dateTo), "M/d", { locale: zhCN }) : "…"}
                    </span>
                  ) : (
                    t("dreams.list.dateRange")
                  )}
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50 transition-all group-hover/filter:opacity-100 group-hover/filter:text-primary" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DateRangeCalendar
                  mode="range"
                  selected={
                    dateFrom && dateTo
                      ? { from: new Date(dateFrom), to: new Date(dateTo) }
                      : dateFrom
                        ? { from: new Date(dateFrom), to: undefined }
                        : undefined
                  }
                  onSelect={(range) => {
                    if (range?.from) {
                      setDateFrom(format(range.from, "yyyy-MM-dd"));
                      setDateTo(range?.to ? format(range.to, "yyyy-MM-dd") : null);
                      setPage(1);
                    }
                  }}
                  locale={
                    i18n.language === "ja"
                      ? (ja as unknown as Partial<DayPickerLocale>)
                      : i18n.language === "en"
                        ? (enUS as unknown as Partial<DayPickerLocale>)
                        : (zhCN as unknown as Partial<DayPickerLocale>)
                  }
                  numberOfMonths={1}
                />
                {(dateFrom || dateTo) && (
                  <div className="p-2 border-t">
                    <button
                      type="button"
                      className="w-full text-xs text-foreground py-2 rounded-md transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => { setDateFrom(null); setDateTo(null); setPage(1); }}
                    >
                      {t("dreams.list.clearDate")}
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* 梦境类型筛选（多选） */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className={cn(
                    "group/filter h-10 gap-1.5 transition-all duration-200 text-foreground",
                    "hover:bg-primary/10 hover:border-primary/50 hover:text-primary hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                    dreamTypeFilter.length > 0 && "border-primary/50 bg-primary/5"
                  )}
                >
                  <Tag className="w-3.5 h-3.5 shrink-0 transition-colors group-hover/filter:text-primary" />
                  {t("dreams.list.dreamType")}
                  {dreamTypeFilter.length > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs bg-primary/20 dark:bg-primary/15 text-primary border-primary/30">
                      {dreamTypeFilter.length}
                    </Badge>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50 transition-all group-hover/filter:opacity-100 group-hover/filter:text-primary" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="filter-popover-content w-56 p-2" align="start">
                <p className="text-xs text-muted-foreground px-2 py-1 mb-1">{t("dreams.list.multiSelect")}</p>
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {DREAM_TYPES.map((type) => {
                    const selected = dreamTypeFilter.includes(type.value);
                    return (
                      <button
                        key={type.value}
                        type="button"
                        className={cn(
                          "filter-popover-option w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-left transition-colors",
                          selected && "filter-popover-option-selected bg-primary/15 text-primary",
                          !selected && "hover:bg-muted"
                        )}
                        onClick={() => {
                          setDreamTypeFilter((prev) =>
                            selected ? prev.filter((v) => v !== type.value) : [...prev, type.value]
                          );
                          setPage(1);
                        }}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        )}>
                          {selected && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                        </div>
                        <svg className="w-2 h-2 shrink-0" viewBox="0 0 8 8" aria-hidden>
                          <circle cx="4" cy="4" r="4" fill={type.color} />
                        </svg>
                        {t(`dreamTypes.${type.value}`)}
                      </button>
                    );
                  })}
                </div>
                {dreamTypeFilter.length > 0 && (
                  <button
                    type="button"
                    className="mt-2 w-full text-xs text-foreground hover:bg-primary/10 hover:text-primary rounded-md py-2 transition-all duration-200"
                    onClick={() => { setDreamTypeFilter([]); setPage(1); }}
                  >
                    {t("dreams.list.clear")}
                  </button>
                )}
              </PopoverContent>
            </Popover>

            {/* 情绪筛选（多选） */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className={cn(
                    "group/filter h-10 gap-1.5 transition-all duration-200 text-foreground",
                    "hover:bg-primary/10 hover:border-primary/50 hover:text-primary hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                    emotionFilter.length > 0 && "border-primary/50 bg-primary/5"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0 transition-colors group-hover/filter:text-primary" />
                  {t("dreams.list.emotion")}
                  {emotionFilter.length > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs bg-primary/20 dark:bg-primary/15 text-primary border-primary/30">
                      {emotionFilter.length}
                    </Badge>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50 transition-all group-hover/filter:opacity-100 group-hover/filter:text-primary" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="filter-popover-content w-56 p-2" align="start">
                <p className="text-xs text-muted-foreground px-2 py-1 mb-1">{t("dreams.list.multiSelect")}</p>
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {emotionOptions.map((emotion) => {
                    const selected = emotionFilter.includes(emotion);
                    const emotionColor = EMOTION_COLOR_MAP[emotion] || "#9ca3af";
                    return (
                      <button
                        key={emotion}
                        type="button"
                        className={cn(
                          "filter-popover-option w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-left transition-colors",
                          selected && "filter-popover-option-selected bg-primary/15 text-primary",
                          !selected && "hover:bg-muted"
                        )}
                        onClick={() => {
                          setEmotionFilter((prev) =>
                            selected ? prev.filter((e) => e !== emotion) : [...prev, emotion]
                          );
                          setPage(1);
                        }}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        )}>
                          {selected && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                        </div>
                        <svg className="w-2 h-2 shrink-0" viewBox="0 0 8 8" aria-hidden>
                          <circle cx="4" cy="4" r="4" fill={emotionColor} />
                        </svg>
                        {getEmotionLabel(emotion, t)}
                      </button>
                    );
                  })}
                </div>
                {emotionFilter.length > 0 && (
                  <button
                    type="button"
                    className="mt-2 w-full text-xs text-foreground hover:bg-primary/10 hover:text-primary rounded-md py-2 transition-all duration-200"
                    onClick={() => { setEmotionFilter([]); setPage(1); }}
                  >
                    {t("dreams.list.clear")}
                  </button>
                )}
              </PopoverContent>
            </Popover>

            {/* 收藏（放最后，与其余四按钮样式一致） */}
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                setFavoriteOnly(!favoriteOnly);
                setPage(1);
              }}
              className={cn(
                "group/filter gap-1.5 h-10 transition-all duration-200 text-foreground",
                "hover:bg-amber-500/10 hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                favoriteOnly 
                  ? "border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400 shadow-md" 
                  : ""
              )}
            >
              <Star className={cn(
                "w-3.5 h-3.5 transition-all duration-200 shrink-0",
                favoriteOnly 
                  ? "fill-amber-500 text-amber-500" 
                  : "opacity-80 group-hover/filter:opacity-100 group-hover/filter:text-amber-500 group-hover/filter:scale-110 group-hover/filter:rotate-12"
              )} />
              {t("dreams.list.favorite")}
            </Button>
            </div>
            
            {/* 筛选结果统计 - 简约版 */}
            {!loading && (search || dreamTypeFilter.length > 0 || emotionFilter.length > 0 || dateFrom || dateTo || favoriteOnly) && (
              <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {t("dreams.list.filteredCount", { count: total })}
                  </span>
                <button
                  type="button"
                  className="group/clear flex items-center justify-center w-5 h-5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setDreamTypeFilter([]);
                    setEmotionFilter([]);
                    setDateFrom(null);
                    setDateTo(null);
                    setFavoriteOnly(false);
                    setPage(1);
                  }}
                    title={t("dreams.list.clearFilters")}
                >
                  <svg 
                    className="w-3.5 h-3.5 text-muted-foreground group-hover/clear:text-red-500 dark:group-hover/clear:text-red-400 transition-all duration-200 group-hover/clear:rotate-90" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* 搜索历史快捷词 */}
          {searchHistory.length > 0 && !searchOpen && (
            <div className="flex flex-wrap gap-1.5 items-center mt-2.5">
              <span className="text-sm text-muted-foreground">{t("dreams.list.recent")}</span>
              {searchHistory.slice(0, 5).map((term, i) => (
                <div
                  key={`${term}-${i}`}
                  className="group relative"
                >
                  <button
                    type="button"
                    className="text-sm px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors max-w-[120px] truncate leading-none"
                    onClick={() => {
                      setSearchInput(term);
                      setSearch(term);
                      setPage(1);
                    }}
                  >
                    {term}
                  </button>
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 transition-all hover:scale-110 invisible group-hover:visible text-muted-foreground hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSearchFromHistory(term);
                    }}
                    title={t("dreams.list.delete")}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 梦境卡片网格：Grid 平铺填满宽度，避免右侧留白 */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dreams.length === 0 ? (
          <div className="text-center py-20">
            <Moon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {t("dreams.list.emptyTitle")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("dreams.list.emptySubtitle")}
            </p>
            <Link href="/dreams/new">
              <Button variant="ghost" size="default" className="gap-2 record-dream-btn">
                <svg 
                  className="h-4 w-4" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                {t("dreams.list.emptyButton")}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {dreams.map((dream, idx) => (
                  <motion.div
                    key={dream.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <DreamCard
                      dream={dream}
                      onToggleFavorite={toggleFavorite}
                      index={idx}
                      searchKeyword={search.trim() || undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="text-foreground hover:border-primary/50 hover:scale-105 hover:-translate-x-1 transition-all duration-200"
                >
                  {t("dreams.list.prevPage")}
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="text-foreground hover:border-primary/50 hover:scale-105 hover:translate-x-1 transition-all duration-200"
                >
                  {t("dreams.list.nextPage")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 右下角浮动按钮：记录新梦境 */}
      <Link
        href="/dreams/new"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        style={{
          background: "linear-gradient(135deg, rgb(124 58 237) 0%, rgb(147 51 234) 100%)",
          boxShadow: "0 4px 20px rgb(124 58 237 / 0.4), 0 2px 8px rgb(0 0 0 / 0.15)",
        }}
        aria-label={t("dreams.list.floatButtonAria")}
      >
        <svg 
          className="h-5 w-5" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </Link>
    </div>
  );
}

// ===== 梦境卡片组件 =====

function DreamCard({
  dream,
  onToggleFavorite,
  index,
  searchKeyword,
}: {
  dream: DreamListItem;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  index: number;
  searchKeyword?: string;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const renderHighlight = (text: string, keyPrefix: string) => {
    if (!searchKeyword || !text) return text;
    const segments = getHighlightSegments(text, searchKeyword);
    return segments.map((seg, i) =>
      typeof seg === "string" ? (
        <span key={`${keyPrefix}-${i}`}>{seg}</span>
      ) : (
        <mark key={`${keyPrefix}-${i}`} className="bg-primary/10 text-primary font-medium rounded px-1 mx-0.5 ring-1 ring-primary/20">
          {seg.text}
        </mark>
      )
    );
  };
  
  // 定义多种颜色，确保每个卡片颜色不同
  const borderColors = [
    "rgb(147 51 234)", // 紫色
    "rgb(99 102 241)", // 蓝紫色
    "rgb(59 130 246)", // 蓝色
    "rgb(6 182 212)", // 青色
    "rgb(16 185 129)", // 青绿色
    "rgb(34 197 94)", // 绿色
    "rgb(132 204 22)",  // 黄绿色
    "rgb(234 179 8)",  // 黄色
    "rgb(249 115 22)",  // 橙色
    "rgb(239 68 68)",  // 橙红色
    "rgb(236 72 153)", // 粉红色
    "rgb(217 70 239)", // 玫红色
  ];
  
  // 使用梦境ID的哈希值来确定颜色，确保同一个梦境始终是同一个颜色
  // 同时避免相邻卡片颜色相同
  let colorIndex = 0;
  if (dream.id) {
    // 使用ID的哈希值
    let hash = 0;
    for (let i = 0; i < dream.id.length; i++) {
      hash = dream.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    colorIndex = Math.abs(hash) % borderColors.length;
  } else {
    // 如果没有ID，使用索引
    colorIndex = index % borderColors.length;
  }
  
  // 如果有情绪颜色就使用，否则使用计算出的颜色
  const borderColor = dream.primary_emotion 
    ? (EMOTION_COLOR_MAP[dream.primary_emotion] ?? borderColors[colorIndex])
    : borderColors[colorIndex];

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/dreams/${dream.id}/edit`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("dreams.list.confirmDelete"))) return;
    try {
      await DreamApi.delete(dream.id);
      toast.success(t("dreams.list.deleteSuccess"));
      window.location.reload();
    } catch {
      toast.error(t("dreams.list.deleteFailed"));
    }
  };

  return (
    <Link href={`/dreams/${dream.id}`}>
      <Card
        className="group break-inside-avoid overflow-hidden hover:shadow-2xl dream-card-hover border-l-4 hover:border-l-6 cursor-pointer transition-all duration-300"
        style={{ borderLeftColor: borderColor }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* 标题行：标题 + AI徽章 */}
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                  {searchKeyword
                    ? renderHighlight(dream.title || "无标题梦境", "title")
                    : (dream.title || "无标题梦境")}
                </CardTitle>
                {/* AI已分析徽章 - 紧靠标题 */}
                {dream.ai_processed && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0 border border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-purple-600/10">
                    <Sparkles className="w-3 h-3 text-violet-500" />
                    <span className="bg-gradient-to-br from-violet-600 to-purple-600 bg-clip-text text-transparent">
                      {t("dreams.list.aiAnalyzed")}
                    </span>
                  </div>
                )}
              </div>
              {/* 元信息行：日期、浏览、隐私 */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1.5">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {format(new Date(dream.dream_date), i18n.language === "en" ? "MMM d" : "M月d日", { 
                    locale: i18n.language === "ja" ? ja : i18n.language === "en" ? enUS : zhCN 
                  })}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Eye className="w-4 h-4 text-green-500" />
                  {dream.view_count ?? 0} {t("dreams.list.views")}
                </span>
                {dream.privacy_level && (
                  <span className="flex items-center gap-1.5 shrink-0">
                    {dream.privacy_level === "PRIVATE" && (
                      <>
                        <Lock className="w-4 h-4 text-purple-500" />
                        <span>{t("dreams.detail.onlyMe")}</span>
                      </>
                    )}
                    {dream.privacy_level === "FRIENDS" && (
                      <>
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>{t("dreams.detail.friendsOnly")}</span>
                      </>
                    )}
                    {dream.privacy_level === "PUBLIC" && (
                      <>
                        <Globe className="w-4 h-4 text-cyan-500" />
                        <span>{t("dreams.detail.public")}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
            
            {/* 操作按钮组 */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => onToggleFavorite(e, dream.id)}
                title={t("dreams.list.favorite")}
                className={cn(
                  "h-8 w-8 hover:bg-transparent transition-all duration-200 group/btn",
                  dream.is_favorite && "opacity-100"
                )}
              >
                <Star
                  className={cn(
                    "w-4 h-4 transition-all duration-200",
                    dream.is_favorite
                      ? "fill-amber-400 text-amber-400 stroke-amber-400"
                      : "text-muted-foreground group-hover/btn:text-amber-400 group-hover/btn:stroke-amber-400 group-hover/btn:scale-110 group-hover/btn:rotate-6"
                  )}
                  strokeWidth={2}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                title={t("common.edit")}
                className="h-8 w-8 hover:bg-transparent transition-all duration-200 group/btn"
              >
                <Edit
                  className="w-4 h-4 transition-all duration-200 text-muted-foreground group-hover/btn:text-blue-500 group-hover/btn:stroke-blue-500 group-hover/btn:scale-110"
                  strokeWidth={2}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                title={t("dreams.list.delete")}
                className="h-8 w-8 hover:bg-transparent transition-all duration-200 group/btn"
              >
                <Trash2
                  className="w-4 h-4 transition-all duration-200 text-muted-foreground group-hover/btn:text-destructive group-hover/btn:stroke-destructive group-hover/btn:scale-110"
                  strokeWidth={2}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <p className="text-sm line-clamp-3 text-muted-foreground leading-relaxed">
            {searchKeyword
              ? renderHighlight(dream.content_preview, "content")
              : dream.content_preview}
          </p>
          {searchKeyword && dream.tags && dream.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {dream.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="gap-1 bg-primary/10 border-primary/30 text-primary font-normal text-xs h-5 px-2"
                >
                  <Tag className="w-3 h-3" />
                  <span>{renderHighlight(tag.name, `tag-${tag.id}`)}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
