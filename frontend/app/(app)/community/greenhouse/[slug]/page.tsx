"use client";

import { DreamCardSocialComponent } from "@/components/community/dream-card-social";
import { communityAPI, type CommunityResponse, type DreamCardSocial, type FeedSort } from "@/lib/community-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, BookOpen, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const SORTS: { value: FeedSort; label: string }[] = [
  { value: "latest", label: "最新" },
  { value: "resonating", label: "共鸣最多" },
];

export default function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [community, setCommunity] = useState<CommunityResponse | null>(null);
  const [dreams, setDreams] = useState<DreamCardSocial[]>([]);
  const [sort, setSort] = useState<FeedSort>("latest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [joining, setJoining] = useState(false);
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/community/greenhouse" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-sm text-muted-foreground">梦境社群</span>
      </div>

      {/* Community info card */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 animate-pulse space-y-3">
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
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl">
              {community.icon || "🌿"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold">{community.name}</h1>
                  {community.is_official && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      官方社群
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={community.is_member ? "outline" : "default"}
                  className={`flex-shrink-0 ${
                    community.is_member
                      ? "border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }`}
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : community.is_member ? "已加入" : "加入社群"}
                </Button>
              </div>
              {community.description && (
                <p className="text-sm text-muted-foreground mt-2">{community.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {community.member_count.toLocaleString()} 成员
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {community.post_count.toLocaleString()} 梦境
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground mb-6">社群不存在</div>
      )}

      {/* Sort tabs */}
      <div className="flex items-center gap-2 mb-5 bg-card border border-border rounded-xl p-1.5 shadow-sm">
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSort(s.value)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              sort === s.value
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {s.label}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary"
          onClick={() => loadFeed(1, true)}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Feed */}
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
    </div>
  );
}
