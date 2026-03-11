"use client";

import { DreamCardSocialComponent } from "@/components/community/dream-card-social";
import { UserSearchCard } from "@/components/community/user-search-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  communityAPI,
  type DreamCardSocial,
  type FeedChannel,
  type FeedSort,
  type SearchResponse,
  type TrendingKeyword,
  type TrendingResponse,
  type UserSearchResult,
} from "@/lib/community-api";
import { AuthToken } from "@/lib/auth-api";
import {
  Loader2, RefreshCw, Hash, ChevronRight, Sparkles, Crown,
  Flame, LogIn, Moon, Search, X, Clock, TrendingUp,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import "@/styles/community.css";

// ── Constants ───────────────────────────────────────────────────────────────

type SearchTab  = "all" | "dreams" | "users" | "tags";
type SearchSort = "relevant" | "latest" | "hot";

// ── Skeletons ────────────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2 flex-1"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div>
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" />
          <div className="flex gap-2"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /></div>
        </div>
      ))}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-2">
          <div className="flex items-center gap-2"><Skeleton className="h-7 w-7 rounded-full" /><Skeleton className="h-3 w-24" /></div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

function TrendingSidebar() {
  const { t } = useTranslation();
  const [trending, setTrending] = useState<TrendingResponse | null>(null);

  useEffect(() => {
    communityAPI.getTrending().then(setTrending).catch(() => {});
  }, []);

  const tags = trending?.tags ?? [];
  const interpreters = trending?.users ?? [];
  const risingUsers = trending?.rising_users ?? [];
  const metrics = trending?.metrics;

  return (
    <div className="space-y-4 sticky top-6">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">{t("community.home.trending.title")}</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          <div className="rounded-lg p-2.5 border border-border/50 bg-muted/40 dark:bg-white/5">
            <p className="text-xs text-muted-foreground mb-1">{t("community.home.trending.todayDreams")}</p>
            <p className="text-lg font-bold text-primary">{metrics ? metrics.today_new_dreams : "—"}</p>
          </div>
          <div className="rounded-lg p-2.5 border border-border/50 bg-muted/40 dark:bg-white/5">
            <p className="text-xs text-muted-foreground mb-1">{t("community.home.trending.todayInterpretations")}</p>
            <p className="text-lg font-bold text-violet-500">{metrics ? metrics.today_interpretation_replies : "—"}</p>
          </div>
          <div className="rounded-lg p-2.5 border border-border/50 bg-muted/40 dark:bg-white/5">
            <p className="text-xs text-muted-foreground mb-1">{t("community.home.trending.activeUsers")}</p>
            <p className="text-lg font-bold text-emerald-500">{metrics ? metrics.active_users_24h : "—"}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />{t("community.home.hotTags.title")}
          </h3>
          <span className="text-[11px] text-muted-foreground">{t("community.home.hotTags.subtitle")}</span>
        </div>
        <div className="space-y-1.5">
          {tags.length === 0
            ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-center space-y-2">
                <p className="text-xs text-muted-foreground">{t("community.home.hotTags.empty")}</p>
                <Link href="/dreams/new" className="inline-flex text-xs text-primary hover:underline">{t("community.home.hotTags.cta")}</Link>
              </div>
            )
            : tags.map((tag, i) => (
                <Link
                  key={tag.name}
                  href={`/community?q=%23${encodeURIComponent(tag.name)}&channel=plaza`}
                  className="group flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-primary/5 transition-all cursor-pointer border border-transparent hover:border-primary/20 hover:-translate-y-0.5"
                  title={t("community.home.hotTags.searchTitle", { tag: tag.name })}
                >
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded ${
                      i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                      i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                      i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                      "text-muted-foreground"
                    }`}>{i + 1}</span>
                    <span className="group-hover:text-primary transition-colors">{tag.name}</span>
                  </div>
                </Link>
              ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-sm">{t("community.home.topInterpreters.title")}</h3>
        </div>
        <div className="space-y-2">
          {interpreters.length === 0
            ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-center space-y-2">
                <p className="text-xs text-muted-foreground">{t("community.home.topInterpreters.empty")}</p>
                <Link href="/dreams/new" className="inline-flex text-xs text-primary hover:underline">{t("community.home.topInterpreters.cta")}</Link>
              </div>
            )
            : interpreters.map((u, i) => (
                <Link
                  key={u.id}
                  href={`/community/users/${u.id}`}
                  className="group flex items-center justify-between hover:bg-violet-500/5 rounded-lg px-2 py-2 transition-all border border-transparent hover:border-violet-500/20 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-9 w-9 flex-shrink-0">
                      {u.avatar ? (
                        <Image
                          src={u.avatar}
                          alt={u.username ?? t("community.home.avatars.user")}
                          fill
                          sizes="36px"
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${
                          i === 0 ? "from-violet-400 to-purple-500" : i === 1 ? "from-blue-400 to-cyan-500" : "from-emerald-400 to-green-500"
                        } flex items-center justify-center text-white text-xs font-medium`}>
                          {u.username?.slice(0, 1) ?? "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-violet-500 transition-colors">{u.username ?? t("community.home.anonymous")}</p>
                      <p className="text-xs text-muted-foreground">{u.is_fallback ? t("community.home.topInterpreters.rookie") : t("community.home.level", { level: u.dreamer_level })}</p>
                    </div>
                  </div>
                  <span className="text-xs text-violet-500 font-medium">{u.is_fallback ? t("community.home.topInterpreters.recommended") : u.interpretation_count}</span>
                </Link>
              ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-rose-500" />
            <h3 className="font-semibold text-sm">{t("community.home.risingInterpreters.title")}</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">{t("community.home.risingInterpreters.subtitle")}</span>
        </div>
        <div className="space-y-2">
          {risingUsers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-center space-y-2">
              <p className="text-xs text-muted-foreground">{t("community.home.risingInterpreters.empty")}</p>
              <Link href="/community?channel=roundtable" className="inline-flex text-xs font-semibold text-primary hover:underline">{t("community.home.risingInterpreters.cta")}</Link>
            </div>
          ) : (
            risingUsers.map((u, i) => (
              <Link
                key={u.id}
                href={`/community/users/${u.id}`}
                className="group flex items-center justify-between hover:bg-rose-500/5 rounded-lg px-2 py-2 transition-all border border-transparent hover:border-rose-500/20 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative h-9 w-9 flex-shrink-0">
                    {u.avatar ? (
                      <Image
                        src={u.avatar}
                        alt={u.username ?? t("community.home.avatars.user")}
                        fill
                        sizes="36px"
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${
                        i === 0 ? "from-rose-400 to-pink-500" : i === 1 ? "from-orange-400 to-amber-500" : "from-sky-400 to-indigo-500"
                      } flex items-center justify-center text-white text-xs font-medium`}>
                        {u.username?.slice(0, 1) ?? "?"}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-rose-500 transition-colors">{u.username ?? t("community.home.anonymous")}</p>
                    <p className="text-xs text-muted-foreground">{t("community.home.level", { level: u.dreamer_level })}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

function CommunityPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const CHANNELS: { value: FeedChannel; label: string; gradient: string; description: string }[] = [
    { value: "plaza",      label: t("community.home.channels.plaza.title"), gradient: "from-blue-500/60 to-cyan-500/60",     description: t("community.home.channels.plaza.desc") },
    { value: "roundtable", label: t("community.home.channels.roundtable.title"), gradient: "from-violet-500/60 to-purple-500/60", description: t("community.home.channels.roundtable.desc") },
    { value: "greenhouse", label: t("community.home.channels.greenhouse.title"), gradient: "from-emerald-500/60 to-green-500/60", description: t("community.home.channels.greenhouse.desc") },
    { value: "museum",     label: t("community.home.channels.museum.title"), gradient: "from-amber-500/60 to-orange-500/60",  description: t("community.home.channels.museum.desc") },
  ];

  // 排序选项（不含"关注的人"——已移至筛选面板）
  const SORTS: { value: FeedSort; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { value: "latest",     label: t("community.home.sort.latest"),   Icon: Clock },
    { value: "resonating", label: t("community.home.sort.resonating"),   Icon: TrendingUp },
    { value: "foryou",     label: t("community.home.sort.foryou"), Icon: Wand2 },
  ];

  const SEARCH_SORTS = [
    { value: "relevant" as const, label: t("community.search.sort.relevant") },
    { value: "latest"   as const, label: t("community.search.sort.latest") },
    { value: "hot"      as const, label: t("community.search.sort.hot") },
  ];

  const SEARCH_TABS = [
    { value: "all"    as const, label: t("community.search.tabs.all") },
    { value: "dreams" as const, label: t("community.search.tabs.dreams") },
    { value: "users"  as const, label: t("community.search.tabs.users") },
    { value: "tags"   as const, label: t("community.search.tabs.tags") },
  ];

  // 热门搜索词的 fallback（API 失败时展示）
  const HOT_KEYWORDS_FALLBACK = [
    t("community.search.hotKeywords.lucid"),
    t("community.search.hotKeywords.nightmare"),
    t("community.search.hotKeywords.flying"),
    t("community.search.hotKeywords.chasing"),
    t("community.search.hotKeywords.lost"),
    t("community.search.hotKeywords.universe"),
  ];

  // Feed state
  const [channel, setChannel] = useState<FeedChannel>((searchParams.get("channel") as FeedChannel) ?? "plaza");
  const [sort, setSort]       = useState<FeedSort>((searchParams.get("sort") as FeedSort) ?? "latest");
  const [dreams, setDreams]   = useState<DreamCardSocial[]>([]);
  const [feedPage, setFeedPage]   = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedLoading, setFeedLoading]     = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  // Feed 筛选面板状态
  const [filterOpen, setFilterOpen]       = useState(false);
  const [followingOnly, setFollowingOnly] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;

  // Search state
  const [searchQuery, setSearchQuery]     = useState(searchParams.get("q") ?? "");
  const [searchActive, setSearchActive]   = useState(!!(searchParams.get("q")));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions]     = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResult, setSearchResult]   = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTab, setSearchTab]         = useState<SearchTab>("all");
  const [searchSort, setSearchSort]       = useState<SearchSort>("relevant");
  const [searchPage, setSearchPage]       = useState(1);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);

  // Trending state（用于搜索建议下拉框中的热门词）
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);

  // 仅在客户端挂载后渲染 FAB portal，避免 SSR 与客户端 hydration 不一致
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const inputRef    = useRef<HTMLInputElement>(null);
  const suggestRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const RECENT_KEY = "dreamlog.community.recentSearches";
  const RECENT_LIMIT = 6;

  const normalizeSearchKeyword = (value: string) =>
    value.trim().replace(/^#+/, "").replace(/^＃+/, "");

  // Recent searches (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((x) => typeof x === "string" && x.trim().length > 0).slice(0, RECENT_LIMIT));
      }
    } catch {
      // ignore
    }
  }, []);

  // 加载热门推荐关键词（用于搜索建议下拉）
  useEffect(() => {
    communityAPI.getTrending().then((t) => setTrendingKeywords(t.keywords)).catch(() => {});
  }, []);

  const persistRecent = (next: string[]) => {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const addRecent = (term: string) => {
    setRecentSearches((prev) => {
      const next = [term, ...prev.filter((x) => x !== term)].slice(0, RECENT_LIMIT);
      persistRecent(next);
      return next;
    });
  };

  const removeRecent = (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((x) => x !== term);
      persistRecent(next);
      return next;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    persistRecent([]);
  };

  // Close filter panel on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);
  const SEARCH_PAGE_SIZE = 20;

  // ── Feed load ─────────────────────────────────────────────────────────────

  const loadFeed = useCallback(async (p: number, replace = false, backgroundRefetch = false) => {
    const isFirstPage = p === 1;
    if (isFirstPage && !backgroundRefetch) setFeedLoading(true);
    if (!isFirstPage) setFeedLoadingMore(true);
    try {
      const actualSort: FeedSort = followingOnly ? "following" : sort;
      const res = await communityAPI.getFeed({ channel, sort: actualSort, page: p, page_size: PAGE_SIZE });
      setFeedTotal(res.total);
      setDreams((prev) => (replace || isFirstPage ? res.items : [...prev, ...res.items]));
      setFeedPage(p);
    } catch {
      if (!backgroundRefetch) toast.error(t("community.home.errors.feedLoadFailed"));
    } finally {
      setFeedLoading(false);
      setFeedLoadingMore(false);
    }
  }, [channel, sort, followingOnly, t]);

  useEffect(() => {
    if (!searchActive) loadFeed(1, true);
  }, [loadFeed, searchActive]);

  // 标签页重新可见时后台刷新 feed，不显示骨架，避免一闪一闪
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && !searchActive && dreams.length > 0) {
        loadFeed(1, true, true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadFeed, searchActive, dreams.length]);

  // ── Search core ───────────────────────────────────────────────────────────

  const doSearch = useCallback(async (q: string, tab: SearchTab, sort: SearchSort, p: number) => {
    const normalizedQ = normalizeSearchKeyword(q);
    if (normalizedQ.length < 2) return;
    if (p === 1) setSearchLoading(true); else setSearchLoadingMore(true);
    try {
      const res = await communityAPI.search({
        q: normalizedQ, type: tab, channel,
        sort, page: p, page_size: SEARCH_PAGE_SIZE,
      });
      if (p === 1) {
        setSearchResult(res);
      } else {
        setSearchResult((prev) => prev
          ? { ...res, dreams: [...prev.dreams, ...res.dreams], users: [...prev.users, ...res.users] }
          : res
        );
      }
      setSearchPage(p);
    } catch {
      toast.error(t("community.search.errors.failed"));
    } finally {
      setSearchLoading(false);
      setSearchLoadingMore(false);
    }
  }, [channel, t]);

  // Re-search when filters change while in search mode
  useEffect(() => {
    if (!searchActive || normalizeSearchKeyword(searchQuery).length < 2) return;
    doSearch(searchQuery, searchTab, searchSort, 1);
  }, [searchTab, searchSort, channel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync search state with URL q changes (including clicking hot tags)
  useEffect(() => {
    const qFromUrl = searchParams.get("q") ?? "";
    const normalizedQ = normalizeSearchKeyword(qFromUrl);

    if (normalizedQ.length >= 2) {
      setSearchQuery(normalizedQ);
      setSearchActive(true);
      doSearch(normalizedQ, searchTab, searchSort, 1);
    } else if (searchActive) {
      setSearchActive(false);
      setSearchQuery("");
      setSearchResult(null);
      loadFeed(1, true);
    }
  }, [searchParams, doSearch, loadFeed, searchTab, searchSort]);

  // ── Search input handlers ─────────────────────────────────────────────────

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    if (suggestRef.current) clearTimeout(suggestRef.current);
    setShowSuggestions(true);
    if (val.trim().length >= 1) {
      suggestRef.current = setTimeout(async () => {
        try {
          const tags = await communityAPI.searchSuggestions(val.trim());
          setSuggestions(tags.slice(0, 5));
        } catch { setSuggestions([]); }
      }, 250);
    } else {
      setSuggestions([]);
      if (searchActive) exitSearch();
    }
  };

  const commitSearch = (q: string) => {
    const normalizedQ = normalizeSearchKeyword(q);
    setShowSuggestions(false);
    if (normalizedQ.length < 2) return;
    addRecent(normalizedQ);
    setSearchQuery(normalizedQ);
    setSearchActive(true);
    setSearchTab("all");
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("q", normalizedQ);
    url.searchParams.set("channel", channel);
    window.history.replaceState(null, "", url.pathname + url.search);
    doSearch(normalizedQ, "all", searchSort, 1);
  };

  const exitSearch = () => {
    setSearchActive(false);
    setSearchQuery("");
    setSearchResult(null);
    setShowSuggestions(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url.pathname + url.search);
    loadFeed(1, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitSearch(searchQuery);
    } else if (e.key === "Escape") {
      if (searchActive) exitSearch();
      else { setShowSuggestions(false); inputRef.current?.blur(); }
    }
  };

  // ── Channel / sort handlers ───────────────────────────────────────────────

  const handleChannelChange = (newChannel: FeedChannel) => {
    if (newChannel === "greenhouse") { router.push("/community/greenhouse"); return; }
    setChannel(newChannel);
    if (searchActive && searchQuery.trim().length >= 2) {
      doSearch(searchQuery, searchTab, searchSort, 1);
    }
  };

  const handleSortChange = (newSort: FeedSort) => {
    setSort(newSort);
  };

  const handleFollowingToggle = () => {
    if (!AuthToken.get()) { setShowLoginDialog(true); return; }
    setFollowingOnly((v) => !v);
    setFilterOpen(false);
  };

  const feedHasMore   = dreams.length < feedTotal;
  const searchHasMore =
    searchTab === "dreams" ? (searchResult?.dreams.length ?? 0) < (searchResult?.total_dreams ?? 0)
    : searchTab === "users" ? (searchResult?.users.length ?? 0) < (searchResult?.total_users ?? 0)
    : false;

  const channelLabel = CHANNELS.find((c) => c.value === channel)?.label ?? t("community.home.channels.plaza.title");

  return (
    <>

      <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Login dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />{t("community.home.loginDialog.title")}
            </DialogTitle>
            <DialogDescription>{t("community.home.loginDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowLoginDialog(false)}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={() => { setShowLoginDialog(false); router.push("/login"); }}>{t("community.home.loginDialog.action")}</Button>
          </div>
        </DialogContent>
      </Dialog>


      <div className="flex gap-6">
        {/* ── Main column ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Channel tabs */}
          <div className="flex items-center gap-3 mb-4 overflow-x-auto overflow-y-visible pb-2 pt-3 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {CHANNELS.map((c) => (
              <button
                key={c.value}
                onClick={() => handleChannelChange(c.value)}
                className={`group relative px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  channel === c.value && c.value !== "greenhouse"
                    ? `bg-gradient-to-r ${c.gradient} text-white shadow-md border border-white/50 dark:border-white/40`
                    : "text-foreground bg-card border border-gray-300/70 dark:border-gray-400/70 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-primary/10 hover:-translate-y-[2.5px] hover:shadow-lg"
                }`}
              >
                {channel === c.value && c.value !== "greenhouse" ? (
                  <div className="flex items-center gap-2">
                    <span>{c.label}</span>
                    <span className="text-xs opacity-90 font-normal">· {c.description}</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-1">
                    {c.label}
                    {c.value === "greenhouse" && (
                      <ChevronRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-1" />
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Search bar & Sort tabs combined ───────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-5">
            {/* Search input */}
            <div className="relative flex-1">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border bg-card transition-all duration-200",
                searchActive || showSuggestions
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-gray-300 hover:border-blue-500 dark:border-gray-600 dark:hover:border-blue-400"
              )}>
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder={t("community.search.placeholder", { channel: channelLabel })}
                  className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground min-w-0"
                />
                {searchActive ? (
                  <button
                    type="button"
                    aria-label={t("community.search.exit")}
                    onClick={exitSearch}
                    className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:scale-110 transition-[transform,color] duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : searchQuery ? (
                  <button
                    type="button"
                    aria-label={t("community.search.clear")}
                    onClick={() => { setSearchQuery(""); setShowSuggestions(true); }}
                    className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:scale-110 transition-[transform,color] duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-popover text-popover-foreground border border-gray-300/80 dark:border-gray-600/80 rounded-2xl shadow-2xl overflow-hidden">
                  {/* Suggestions (when typing) */}
                  {searchQuery.trim().length >= 1 && suggestions.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 pb-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-semibold">{t("community.search.suggestions")}</p>
                        <button
                          onMouseDown={(e) => { e.preventDefault(); setSuggestions([]); }}
                          className="clear-btn text-[11px] text-muted-foreground transition-colors"
                        >
                          {t("community.search.clear")}
                        </button>
                      </div>
                      <div className="space-y-0.5 px-2">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onMouseDown={() => commitSearch(s)}
                            className="group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-left"
                          >
                            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform transition-colors duration-200 group-hover:scale-110 group-hover:text-foreground" />
                            <span className="font-medium text-foreground transition-all duration-200 group-hover:translate-x-0.5">{s}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent searches */}
                  <div className={cn("py-2", (searchQuery.trim().length >= 1 && suggestions.length > 0) && "border-t border-border/60")}>
                    <div className="px-4 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground font-semibold">{t("community.search.recent")}</p>
                      </div>
                      {recentSearches.length > 0 && (
                        <button
                          onMouseDown={(e) => { e.preventDefault(); clearRecent(); }}
                          className="clear-btn text-[11px] text-muted-foreground transition-colors"
                        >
                          {t("community.search.clearAll")}
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5 px-2">
                      {recentSearches.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">{t("community.search.noRecent")}</div>
                      ) : (
                        recentSearches.map((term) => (
                          <div key={term} className="group flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-colors">
                            <button
                              onMouseDown={() => commitSearch(term)}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left"
                            >
                              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform transition-colors duration-200 group-hover:scale-110 group-hover:text-foreground" />
                              <span className="text-sm font-medium text-foreground truncate transition-all duration-200 group-hover:translate-x-0.5">{term}</span>
                            </button>
                            <button
                              aria-label={t("community.search.removeRecent")}
                              onMouseDown={(e) => { e.preventDefault(); removeRecent(term); }}
                              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground opacity-70 transition-transform transition-colors duration-200 ease-out group-hover:opacity-100 group-hover:text-foreground group-hover:scale-110 group-hover:rotate-45 hover:opacity-100 hover:text-foreground hover:rotate-45"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Trending / hot keywords */}
                  <div className="py-2 border-t border-border/60">
                    <div className="px-4 pb-2">
                      <p className="text-xs text-muted-foreground font-semibold">{t("community.search.hotKeywords.title")}</p>
                    </div>
                    {trendingKeywords.length > 0 ? (
                      <div className="space-y-0.5 px-2 pb-1">
                        {trendingKeywords.slice(0, 6).map((kw) => (
                          <button
                            key={kw.keyword}
                            onMouseDown={() => commitSearch(kw.keyword)}
                            className="group w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left text-popover-foreground"
                          >
                            <TrendingUp className="h-4 w-4 text-orange-400 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                            <span className="text-sm font-medium text-foreground truncate transition-all duration-200 group-hover:translate-x-0.5">{kw.keyword}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 pb-2">
                        <div className="flex flex-wrap gap-1.5">
                          {HOT_KEYWORDS_FALLBACK.map((kw) => (
                            <button
                              key={kw}
                              onMouseDown={() => commitSearch(kw)}
                              className="hot-keyword-btn text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-gray-300/70 dark:border-gray-600/70 transition-all duration-200"
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary action */}
                  {searchQuery.trim().length >= 2 && (
                    <button
                      onMouseDown={() => commitSearch(searchQuery)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-primary hover:bg-primary/5 border-t border-border/60 transition-colors font-semibold"
                    >
                      <Search className="h-4 w-4" />
                      {t("community.search.searchFor", { keyword: searchQuery.trim() })}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sort tabs (only in normal feed mode) */}
            {!searchActive && (
              <div className="flex items-center gap-2 bg-card border border-gray-300/80 dark:border-gray-600/80 rounded-xl shadow-sm hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200">
                {SORTS.map((s) => {
                  const active = !followingOnly && sort === s.value;
                  const indicatorColor = 
                    s.value === "latest" ? "bg-blue-500" :
                    s.value === "resonating" ? "bg-orange-500" :
                    "bg-violet-500";
                  const iconColorClass = 
                    s.value === "latest" ? "text-blue-500 dark:text-blue-400" :
                    s.value === "resonating" ? "text-orange-500 dark:text-orange-400" :
                    "text-violet-500 dark:text-violet-400";
                  return (
                    <button
                      key={s.value}
                      onClick={() => handleSortChange(s.value)}
                      className={`group relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <s.Icon className={`h-3.5 w-3.5 transition-transform duration-200 ${iconColorClass} ${active ? "" : "group-hover:scale-125"}`} />
                      <span className={`transition-transform duration-200 ${!active ? "group-hover:translate-x-1" : ""}`}>{s.label}</span>
                      {active && (
                        <span className={`absolute bottom-0 left-1 right-1 h-0.5 rounded-full ${indicatorColor}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Refresh button */}
            {!searchActive && (
              <Button
                variant="ghost"
                size="sm"
                className="group h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary border border-gray-300/80 dark:border-gray-600/80 rounded-lg transition-all duration-200"
                onClick={() => loadFeed(1, true)}
              >
                <RefreshCw className="h-4 w-4 text-emerald-500 dark:text-emerald-400 group-hover:rotate-180 transition-transform duration-300" />
              </Button>
            )}
          </div>

          {/* ── Search mode UI ────────────────────────────────────────────── */}
          {searchActive ? (
            <>
              {/* Search tabs + sort */}
              <div className="flex items-center justify-between mb-4 border-b border-border">
                <div className="flex items-center gap-0">
                  {SEARCH_TABS.map((t) => {
                    const count =
                      t.value === "dreams" ? searchResult?.total_dreams
                      : t.value === "users" ? searchResult?.total_users
                      : t.value === "tags"  ? searchResult?.tags.length
                      : undefined;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setSearchTab(t.value)}
                        className={cn(
                          "pb-2.5 px-3 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-[transform,color] duration-200",
                          searchTab === t.value
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:scale-105"
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                {/* Sort (only for dream/all tabs) */}
                {searchTab !== "users" && searchTab !== "tags" && (
                  <div className="flex items-center gap-1">
                    {SEARCH_SORTS.map((s) => {
                      const isActive = searchSort === s.value;
                      return (
                        <button
                          key={s.value}
                          onClick={() => setSearchSort(s.value)}
                          data-active={isActive ? "true" : undefined}
                          className={cn(
                            "sort-btn text-xs font-medium px-2.5 py-1 rounded border transition-all duration-200",
                            isActive
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "text-muted-foreground hover:scale-105"
                          )}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search results */}
              {searchLoading ? (
                <SearchSkeleton />
              ) : searchResult ? (
                <SearchResultsInline
                  result={searchResult}
                  tab={searchTab}
                  keyword={searchQuery}
                  hasMore={searchHasMore}
                  loadingMore={searchLoadingMore}
                  onLoadMore={() => doSearch(searchQuery, searchTab, searchSort, searchPage + 1)}
                  onTabChange={setSearchTab}
                />
              ) : null}
            </>
          ) : (
            <>
              {/* ── Normal Feed mode ────────────────────────────────────── */}
              {/* Feed */}
              {feedLoading ? (
                <FeedSkeleton />
              ) : dreams.length === 0 ? (
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 border-2 border-dashed border-primary/20 rounded-2xl p-12 text-center">
                  <div className="text-5xl mb-4">🌙</div>
                  <h3 className="text-xl font-semibold mb-2">{t("community.home.empty.title")}</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {channel === "plaza" && t("community.home.empty.plaza")}
                    {channel === "roundtable" && t("community.home.empty.roundtable")}
                    {channel === "greenhouse" && t("community.home.empty.greenhouse")}
                    {channel === "museum" && t("community.home.empty.museum")}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link href={channel === "roundtable" ? "/dreams/new?seek=1&privacy=PUBLIC" : "/dreams/new"}>
                      <Button className="shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-[0.98]">
                        {channel === "roundtable" ? t("community.home.empty.seekHelp") : t("community.home.empty.recordDream")}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {dreams.map((dream) => (
                    <DreamCardSocialComponent key={dream.id} dream={dream} />
                  ))}
                  {feedHasMore && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => loadFeed(feedPage + 1)}
                        disabled={feedLoadingMore}
                        className="border-primary/30 hover:border-primary hover:bg-primary/5"
                      >
                        {feedLoadingMore ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("community.home.loading")}</> : <>{t("community.home.loadMoreDreams")} <ChevronRight className="h-4 w-4 ml-1" /></>}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-72 flex-shrink-0">
          <TrendingSidebar />
        </aside>
      </div>
    </div>
    </>
  );
}

// ── Inline search results ────────────────────────────────────────────────────

function SearchResultsInline({
  result, tab, keyword, hasMore, loadingMore, onLoadMore, onTabChange,
}: {
  result: SearchResponse;
  tab: SearchTab;
  keyword: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onTabChange: (t: SearchTab) => void;
}) {
  const { t } = useTranslation();
  const isEmpty = result.dreams.length === 0 && result.users.length === 0 && result.tags.length === 0;

  // 根据当前 tab 确定空状态提示
  const getEmptyMessage = () => {
    if (tab === "dreams") return t("community.search.empty.dreams", { keyword });
    if (tab === "users") return t("community.search.empty.users", { keyword });
    if (tab === "tags") return t("community.search.empty.tags", { keyword });
    return t("community.search.empty.all", { keyword });
  };

  // 判断当前 tab 是否有结果
  const currentTabEmpty = 
    (tab === "all" && isEmpty) ||
    (tab === "dreams" && result.dreams.length === 0) ||
    (tab === "users" && result.users.length === 0) ||
    (tab === "tags" && result.tags.length === 0);

  if (currentTabEmpty) {
    return (
      <div className="text-center py-14 text-muted-foreground">
        <div className="flex justify-center mb-4">
          <Moon className="w-12 h-12 text-muted-foreground/50" strokeWidth={1.25} />
        </div>
        <p className="text-sm font-medium mb-1">{getEmptyMessage()}</p>
        <p className="text-xs mb-4">{t("community.search.empty.hint")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {HOT_KEYWORDS_FALLBACK.map((kw) => (
            <Link key={kw} href="#" onClick={(e) => { e.preventDefault(); }} className="text-xs px-3 py-1 rounded-full border border-gray-300/80 dark:border-gray-600/80 hover:border-primary/50 hover:text-primary hover:scale-105 transition-all duration-200">{kw}</Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dreams */}
      {(tab === "all" || tab === "dreams") && result.dreams.length > 0 && (
        <section>
          <div className="space-y-3">
            {result.dreams.map((dream) => <DreamCardSocialComponent key={dream.id} dream={dream} />)}
          </div>
        </section>
      )}

      {/* Users */}
      {(tab === "all" || tab === "users") && result.users.length > 0 && (
        <section>
          <div className="space-y-2">
            {result.users.map((user: UserSearchResult) => <UserSearchCard key={user.id} user={user} highlight={keyword} />)}
          </div>
        </section>
      )}

      {/* Tags */}
      {(tab === "all" || tab === "tags") && result.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.tags.map((tag: string) => (
            <span key={tag} className="px-3 py-1.5 rounded-full border border-border text-sm hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
              <span className="text-primary/60 mr-0.5">#</span>{tag}
            </span>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore} className="min-w-32">
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : t("community.home.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    }>
      <CommunityPageContent />
    </Suspense>
  );
}
