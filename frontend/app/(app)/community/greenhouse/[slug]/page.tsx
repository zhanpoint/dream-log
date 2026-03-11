"use client";

import { DreamCardSocialComponent } from "@/components/community/dream-card-social";
import { communityAPI, type CommunityResponse, type DreamCardSocial, type FeedSort } from "@/lib/community-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GreenhouseShell } from "@/components/community/greenhouse-shell";
import { GreenhouseOverviewPanel } from "@/components/community/greenhouse-overview-panel";
import {
  Loader2,
  ChevronDown,
  MoonStar,
  Skull,
  BrainCircuit,
  Sparkles,
  HeartHandshake,
  Orbit,
  Stars,
  Compass,
  Film,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const SORT_VALUES: FeedSort[] = ["latest", "resonating"];

const getSortLabelKey = (value: FeedSort): string => {
  if (value === "latest") return "community.home.sort.latest";
  if (value === "resonating") return "community.home.sort.resonating";
  if (value === "following") return "community.feed.sortFollowing";
  if (value === "foryou") return "community.feed.sortForYou";
  return "community.home.sort.latest";
};

const getCommunityIcon = (slug: string): ReactNode => {
  const iconClass = "w-8 h-8 text-emerald-600 dark:text-emerald-300";
  const iconBySlug: Record<string, ReactNode> = {
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

export default function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useTranslation();
  const [community, setCommunity] = useState<CommunityResponse | null>(null);
  const [dreams, setDreams] = useState<DreamCardSocial[]>([]);
  const [sort, setSort] = useState<FeedSort>("latest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [joining, setJoining] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;

  // Load community info
  useEffect(() => {
    communityAPI.getCommunity(slug)
      .then(setCommunity)
      .catch(() => toast.error("加载社群信息失败"))
      .finally(() => setLoading(false));
  }, [slug]);

  // Load feed
  const loadFeed = useCallback(async (p: number, replace = false) => {
    if (p === 1) setFeedLoading(true);
    else setLoadingMore(true);
    try {
      const res = await communityAPI.getCommunityFeed(slug, { sort, page: p, page_size: PAGE_SIZE });
      setTotal(res.total);
      setDreams((prev) => (replace || p === 1 ? res.items : [...prev, ...res.items]));
      setPage(p);
    } catch {
      toast.error("加载梦境失败");
    } finally {
      setFeedLoading(false);
      setLoadingMore(false);
    }
  }, [slug, sort]);

  useEffect(() => {
    loadFeed(1, true);
  }, [loadFeed]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadFeed(1, true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadFeed]);

  useEffect(() => {
    if (!sortOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [sortOpen]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await communityAPI.joinCommunity(slug);
      setCommunity((prev) => prev ? { ...prev, is_member: res.joined, member_count: res.member_count } : prev);
      toast.success(res.joined ? "已成功加入社群！" : "已退出社群");
    } catch {
      toast.error("操作失败，请稍后重试");
    } finally {
      setJoining(false);
    }
  };

  const hasMore = dreams.length < total;

  const header = (
    <div>
      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-5 mb-5 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      ) : community ? (
        <div className="mb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20 flex items-center justify-center">
              {getCommunityIcon(community.slug)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{community.name}</h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground mb-6">社群不存在</div>
      )}

      <div className="relative flex items-center gap-2 mb-5" ref={sortRef}>
        <button
          type="button"
          onClick={() => setSortOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 dark:hover:bg-muted/20"
        >
          <span>{t(getSortLabelKey(sort))}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${sortOpen ? "rotate-180" : ""}`} />
        </button>
        {sortOpen && (
          <div className="absolute z-20 mt-10 rounded-xl border border-border bg-popover p-2 shadow-lg">
            {SORT_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSort(value);
                  setSortOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  sort === value
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-muted/20"
                }`}
              >
                <span>{t(getSortLabelKey(value))}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <GreenhouseShell
      activeSlug={community?.slug}
      header={header}
      rightPanel={community ? <GreenhouseOverviewPanel slug={community.slug} /> : null}
    >
      {feedLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      ) : dreams.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <div className="text-5xl mb-4">🌙</div>
          <p className="font-medium text-muted-foreground">这个社群还没有梦境</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">加入后分享你的梦境，成为第一位！</p>
          <Link href="/dreams/new">
            <Button size="sm">记录我的梦境</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {dreams.map((dream) => (
            <DreamCardSocialComponent key={dream.id} dream={dream} />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadFeed(page + 1)}
                disabled={loadingMore}
                className="border-primary/30 hover:border-primary hover:bg-primary/5"
              >
                {loadingMore ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />加载中...</>
                ) : (
                  "加载更多"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </GreenhouseShell>
  );
}
