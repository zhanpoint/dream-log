"use client";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { explorationAPI, type SymbolListItem } from "@/lib/exploration-api";
import { 
  ChevronLeft, 
  Search, 
  MapPin,      // 场景 - 地图标记
  Sparkles,    // 动物 - 星星/魔法
  Users,       // 人物 - 多人
  Zap,         // 行为 - 闪电/动作
  Package,     // 物体 - 包裹/盒子
  Navigation,  // 地点 - 导航/指南针
  Trees,       // 自然 - 树木
  Heart,       // 情绪 - 心形
  User         // 身体 - 单人
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  动物: "动物",
  行为: "行为",
  人物: "人物",
  地点: "地点",
  场景: "场景",
  物体: "物体",
  情绪: "情绪",
  身体: "身体",
  自然: "自然",
  自然现象: "自然",
};

const CATEGORY_ICONS: Record<string, any> = {
  场景: MapPin,      // 场景 - 地图标记
  动物: Sparkles,    // 动物 - 星星（代表生命力）
  人物: Users,       // 人物 - 多人图标
  行为: Zap,         // 行为 - 闪电（代表动作）
  物体: Package,     // 物体 - 包裹
  地点: Navigation,  // 地点 - 导航指南针
  自然: Trees,       // 自然 - 树木
  情绪: Heart,       // 情绪 - 心形
  身体: User,        // 身体 - 单人图标
};

export default function SymbolsPage() {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* 顶部：返回 + 标题 + 价值说明 */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/exploration"
            className="group inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">梦境探索</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            梦境符号词典
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            从梦中出现的符号入手，理解可能与你相关的含义，更懂自己的潜意识
          </p>
        </div>

        {/* 搜索：更突出、圆角、聚焦体验 */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-10 h-10 transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="输入梦中出现的词，如 蛇、坠落、考试…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* 分类：横向滚动、胶囊样式、选中更明显 */}
        <div className="mb-8 overflow-x-auto pb-1 -mx-1">
          <div className="flex gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                activeCategory === null
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 hover:scale-105 font-medium"
              }`}
            >
              全部
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
                {CATEGORY_LABELS[cat] ?? cat}
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
              {search ? `没有找到与「${search}」相关的符号，试试其他词或切换分类` : "暂无符号内容，请稍后再来"}
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
                      {CATEGORY_LABELS[category] ?? category}
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
            <span className="text-sm text-muted-foreground">加载更多…</span>
          </div>
        )}
      </div>
    </div>
  );
}
