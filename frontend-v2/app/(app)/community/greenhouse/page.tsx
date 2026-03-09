"use client";

import { communityAPI, type CommunityResponse } from "@/lib/community-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function CommunityCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

function CommunityCard({ community, onJoinToggle }: { community: CommunityResponse; onJoinToggle: (slug: string) => void }) {
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setJoining(true);
    try {
      await onJoinToggle(community.slug);
    } finally {
      setJoining(false);
    }
  };

  return (
    <Link
      href={`/community/greenhouse/${community.slug}`}
      className="group block bg-card border border-border hover:border-emerald-500/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
          {community.icon || "🌿"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {community.name}
              </h3>
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
              className={`flex-shrink-0 transition-all ${
                community.is_member
                  ? "border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }`}
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? "..." : community.is_member ? "已加入" : "加入"}
            </Button>
          </div>

          {community.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{community.description}</p>
          )}

          {/* Stats */}
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
    </Link>
  );
}

export default function GreenhousePage() {
  const [communities, setCommunities] = useState<CommunityResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityAPI.getCommunities()
      .then((res) => setCommunities(res.items))
      .catch(() => toast.error("加载社群失败"))
      .finally(() => setLoading(false));
  }, []);

  const handleJoinToggle = async (slug: string) => {
    try {
      const res = await communityAPI.joinCommunity(slug);
      setCommunities((prev) =>
        prev.map((c) =>
          c.slug === slug
            ? { ...c, is_member: res.joined, member_count: res.member_count }
            : c
        )
      );
      toast.success(res.joined ? "已成功加入社群！" : "已退出社群");
    } catch {
      toast.error("操作失败，请稍后重试");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/community" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">梦境社群</h1>
          <p className="text-sm text-muted-foreground">加入与你志同道合的梦境探索小组</p>
        </div>
      </div>

      {/* Community list */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CommunityCardSkeleton key={i} />)
          : communities.length === 0
          ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-5xl mb-4">🌿</div>
              <p className="font-medium">暂无社群</p>
              <p className="text-sm mt-1">敬请期待更多精彩社群</p>
            </div>
          )
          : communities.map((c) => (
              <CommunityCard key={c.id} community={c} onJoinToggle={handleJoinToggle} />
            ))
        }
      </div>
    </div>
  );
}
