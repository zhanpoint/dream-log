"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, X, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DreamCardSocialComponent } from "@/components/community/dream-card-social";
import { UserSearchCard } from "@/components/community/user-search-card";
import { communityAPI, type FeedChannel, type SearchResponse } from "@/lib/community-api";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// ── Types ──────────────────────────────────────────────────────────────────
type SearchTab = "all" | "dreams" | "users" | "tags";
type SearchSort = "relevant" | "latest" | "hot";

// ── Main page ───────────────────────────────────────────────────────────────
function SearchPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();

  const TABS: { value: SearchTab; label: string }[] = [
    { value: "all", label: t("community.search.allTab") },
    { value: "dreams", label: t("community.search.dreamsTab") },
    { value: "users", label: t("community.search.usersTab") },
    { value: "tags", label: t("community.search.tagsTab") },
  ];

  const SORTS: { value: SearchSort; label: string }[] = [
    { value: "relevant", label: t("community.search.sortRelevant") },
    { value: "latest", label: t("community.search.sortLatest") },
    { value: "hot", label: t("community.search.sortHot") },
  ];

  const CHANNELS: { value: FeedChannel; label: string }[] = [
    { value: "plaza", label: t("community.home.channels.plaza.title") },
    { value: "roundtable", label: t("community.home.channels.roundtable.title") },
    { value: "greenhouse", label: t("community.home.channels.greenhouse.title") },
    { value: "museum", label: t("community.home.channels.museum.title") },
  ];

  const initialQ = params.get("q") ?? "";
  const initialChannel = (params.get("channel") ?? "plaza") as FeedChannel;
  const initialTab = (params.get("type") ?? "all") as SearchTab;
  const initialSort = (params.get("sort") ?? "relevant") as SearchSort;

  const [searchInput, setSearchInput] = useState(initialQ);
  const [tab, setTab] = useState<SearchTab>(initialTab);
  const [sort, setSort] = useState<SearchSort>(initialSort);
  const [channel, setChannel] = useState<FeedChannel>(initialChannel);

  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 20;

  const doSearch = useCallback(
    async (q: string, p: number, replace: boolean) => {
      if (q.trim().length < 2) return;
      if (p === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await communityAPI.search({
          q: q.trim(),
          type: tab,
          channel,
          sort,
          page: p,
          page_size: PAGE_SIZE,
        });
        if (replace || p === 1) {
          setResult(res);
        } else {
          setResult((prev) =>
            prev
              ? { ...res, dreams: [...prev.dreams, ...res.dreams], users: [...prev.users, ...res.users] }
              : res
          );
        }
        setPage(p);
      } catch {
        // silent
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tab, channel, sort]
  );

  // Re-search on filter change
  useEffect(() => {
    const q = searchInput.trim();
    if (q.length < 2) return;
    const url = new URL(window.location.href);
    url.searchParams.set("q", q);
    url.searchParams.set("type", tab);
    url.searchParams.set("channel", channel);
    url.searchParams.set("sort", sort);
    router.replace(url.pathname + url.search, { scroll: false });
    doSearch(q, 1, true);
  }, [tab, channel, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial search on mount
  useEffect(() => {
    if (initialQ.trim().length >= 2) doSearch(initialQ, 1, true);
    // Auto focus after mount
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 标签页重新可见时重新拉取搜索结果，保证梦境卡片上的共鸣/评论/解读/浏览数为最新
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && searchInput.trim().length >= 2) {
        doSearch(searchInput, 1, true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [searchInput, doSearch]);

  const handleInputChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val, 1, true), 400);
    } else if (val.trim().length === 0) {
      setResult(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(searchInput, 1, true);
    }
    if (e.key === "Escape") router.push("/community");
  };

  const q = searchInput.trim();
  const hasMore =
    tab === "dreams"
      ? (result?.dreams.length ?? 0) < (result?.total_dreams ?? 0)
      : tab === "users"
      ? (result?.users.length ?? 0) < (result?.total_users ?? 0)
      : false;

  const channelLabel =
    CHANNELS.find((c) => c.value === channel)?.label ?? t("community.home.channels.plaza.title");

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/community">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("community.search.placeholder")}
            className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          {searchInput && (
            <button
              aria-label={t("community.search.clear")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setSearchInput(""); setResult(null); inputRef.current?.focus(); }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scope + Sort bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        {/* Channel dropdown */}
        <div className="relative">
          <select
            aria-label={t("community.search.scope")}
            value={channel}
            onChange={(e) => setChannel(e.target.value as FeedChannel)}
            className="appearance-none text-xs pl-3 pr-7 py-1.5 rounded-lg border border-border bg-card cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Sort buttons */}
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5 gap-0.5 ml-auto">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md transition-colors whitespace-nowrap",
                sort === s.value
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Result tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 mb-4 border-b border-border">
        {TABS.map((t) => {
          const count =
            t.value === "dreams" ? result?.total_dreams
            : t.value === "users" ? result?.total_users
            : t.value === "tags" ? result?.tags.length
            : undefined;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "pb-2.5 px-4 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5",
                tab === t.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center",
                  tab === t.value
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {count >= 1000 ? "999+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content area ──────────────────────────────────────────────── */}
      {q.length < 2 ? (
        <EmptyPrompt />
      ) : loading ? (
        <LoadingSkeleton />
      ) : result ? (
        <SearchResults
          result={result}
          tab={tab}
          keyword={q}
          channel={channel}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={() => doSearch(q, page + 1, false)}
          onTabChange={setTab}
        />
      ) : null}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function EmptyPrompt() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="text-4xl mb-4">🔍</div>
      <p className="text-sm font-medium mb-1">{t("community.search.emptyPromptTitle")}</p>
      <p className="text-xs opacity-70">{t("community.search.emptyPromptDesc")}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function SearchResults({
  result,
  tab,
  keyword,
  channel,
  hasMore,
  loadingMore,
  onLoadMore,
  onTabChange,
}: {
  result: SearchResponse;
  tab: SearchTab;
  keyword: string;
  channel: FeedChannel;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onTabChange: (t: SearchTab) => void;
}) {
  const { t } = useTranslation();
  const isEmpty =
    result.dreams.length === 0 && result.users.length === 0 && result.tags.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="text-4xl mb-4">🌙</div>
        <p className="text-sm font-medium mb-1">{t("community.search.empty.all", { keyword })}</p>
        <p className="text-xs mb-4">{t("community.search.empty.hint")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            t("community.search.hotKeywords.nightmare"),
            t("community.search.hotKeywords.lucid"),
            t("community.search.hotKeywords.flying"),
            t("community.search.hotKeywords.chasing"),
            t("community.search.hotKeywords.lost"),
          ].map((tag) => (
            <Link
              key={tag}
              href={`/community/search?q=${encodeURIComponent(tag)}&channel=${channel}`}
              className="text-xs px-3 py-1 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dreams section */}
      {(tab === "all" || tab === "dreams") && result.dreams.length > 0 && (
        <section>
          {tab === "all" && (
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                梦境 <span className="text-primary ml-1">{result.total_dreams}</span>
              </h3>
              {result.total_dreams > result.dreams.length && (
                <button
                  onClick={() => onTabChange("dreams")}
                  className="text-xs text-primary hover:underline"
                >
                  查看全部 {result.total_dreams} 条 →
                </button>
              )}
            </div>
          )}
          <div className="space-y-3">
            {result.dreams.map((dream) => (
              <DreamCardSocialComponent key={dream.id} dream={dream} />
            ))}
          </div>
        </section>
      )}

      {/* Users section */}
      {(tab === "all" || tab === "users") && result.users.length > 0 && (
        <section>
          {tab === "all" && (
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                用户 <span className="text-primary ml-1">{result.total_users}</span>
              </h3>
              {result.total_users > result.users.length && (
                <button
                  onClick={() => onTabChange("users")}
                  className="text-xs text-primary hover:underline"
                >
                  查看全部 {result.total_users} 位 →
                </button>
              )}
            </div>
          )}
          <div className="space-y-2">
            {result.users.map((user) => (
              <UserSearchCard key={user.id} user={user} highlight={keyword} />
            ))}
          </div>
        </section>
      )}

      {/* Tags section */}
      {(tab === "all" || tab === "tags") && result.tags.length > 0 && (
        <section>
          {tab === "all" && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              相关标签 <span className="text-primary ml-1">{result.tags.length}</span>
            </h3>
          )}
          <div className="flex flex-wrap gap-2">
            {result.tags.map((tag) => (
              <Link
                key={tag}
                href={`/community/search?q=${encodeURIComponent(tag)}&type=dreams&channel=${channel}`}
                className="px-3 py-1.5 rounded-full border border-border text-sm hover:border-primary/40 hover:bg-primary/5 transition-all hover:-translate-y-0.5"
              >
                <span className="text-primary/60 mr-0.5">#</span>{tag}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="min-w-32"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "加载更多"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Export with Suspense ──────────────────────────────────────────────────────
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
