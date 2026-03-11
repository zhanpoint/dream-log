"use client";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { explorationAPI, type SymbolListItem } from "@/lib/exploration-api";
import {
  ChevronLeft,
  Search,
  MapPin,
  Sparkles,
  Users,
  Zap,
  Package,
  Navigation,
  Trees,
  Heart,
  User,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  场景: MapPin,
  动物: Sparkles,
  人物: Users,
  行为: Zap,
  物体: Package,
  地点: Navigation,
  自然: Trees,
  自然现象: Trees,
  情绪: Heart,
  身体: User,
};

export default function SymbolsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<SymbolListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef("");
  const fetchIdRef = useRef(0);

  useEffect(() => {
    explorationAPI.getCategories().then(setCategories).catch(console.error);
  }, []);

  const fetchSymbols = useCallback(
    async (p: number, reset: boolean) => {
      const currentSearch = searchRef.current.trim() || undefined;
      const id = ++fetchIdRef.current;
      setLoading(true);
      try {
        const res = await explorationAPI.listSymbols({
          category: activeCategory ?? undefined,
          search: currentSearch,
          page: p,
          page_size: PAGE_SIZE,
        });
        if (id !== fetchIdRef.current) return;
        setTotal(res.total);
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setHasMore(p * PAGE_SIZE < res.total);
      } catch (err) {
        if (id !== fetchIdRef.current) return;
        console.error(err);
      } finally {
        if (id === fetchIdRef.current) setLoading(false);
      }
    },
    [activeCategory]
  );

  // 仅分类变化时拉取（含首次进入「全部」）；搜索由防抖单独触发，避免竞态
  useEffect(() => {
    setPage(1);
    fetchSymbols(1, true);
  }, [activeCategory, fetchSymbols]);

  // 搜索防抖：只在这里触发搜索请求，并始终用最新 search（通过 ref）
  const handleSearchChange = (val: string) => {
    setSearch(val);
    searchRef.current = val;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchSymbols(1, true);
    }, 400);
  };

  // 无限滚动
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchSymbols(nextPage, false);
      }
    });
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, page, fetchSymbols]);

  // 按分类分组
  const grouped = items.reduce<Record<string, SymbolListItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  const getCategoryLabel = (category: string) =>
    t(`exploration.symbolsPage.categories.${category}`, { defaultValue: category });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/exploration"
            className="group inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">{t("exploration.symbolsPage.backLink")}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("exploration.symbolsPage.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            {t("exploration.symbolsPage.subtitle")}
          </p>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-10 h-10 transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder={t("exploration.symbolsPage.searchPlaceholder")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="mb-8 -mx-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                activeCategory === null
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 hover:scale-105 font-medium"
              }`}
            >
              {t("exploration.symbolsPage.all")}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 hover:scale-105 font-medium"
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        {loading && items.length === 0 ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-5 w-20 mb-4 rounded" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-14 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border/60">
            <p className="text-muted-foreground">
              {search
                ? t("exploration.symbolsPage.emptySearch", { query: search })
                : t("exploration.symbolsPage.emptyDefault")}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, syms]) => {
              const IconComponent = CATEGORY_ICONS[category];
              return (
                <section key={category} className="animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    {IconComponent && (
                      <IconComponent className="h-4 w-4 text-primary" />
                    )}
                    <h2 className="text-sm font-medium text-foreground">
                      {getCategoryLabel(category)}
                    </h2>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2">
                    {syms.map((sym) => (
                      <Link
                        key={sym.id}
                        href={`/exploration/symbols/${sym.slug}`}
                        className="group flex items-center justify-center rounded-lg border border-border/60 px-2 py-1.5 text-center text-sm text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 min-h-[2.5rem]"
                      >
                        <span className="group-hover:text-primary transition-colors line-clamp-2">
                          {sym.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div ref={loadMoreRef} className="h-12 mt-6" />
        {loading && items.length > 0 && (
          <div className="flex justify-center py-6">
            <span className="text-sm text-muted-foreground">{t("exploration.symbolsPage.loadMore")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
