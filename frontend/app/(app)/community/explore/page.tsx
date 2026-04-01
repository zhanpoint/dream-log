"use client";

import { communityAPI, type ExploreResponse } from "@/lib/community-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Flame,
  Crown,
  Users,
  BookOpen,
  Hash,
  CheckCircle2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function ExplorePage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ExploreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinedSlugs, setJoinedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    communityAPI.getExplore()
      .then(setData)
      .catch(() => toast.error(t("community.explore.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  const handleJoin = async (slug: string) => {
    try {
      const res = await communityAPI.joinCommunity(slug);
      setJoinedSlugs((prev) => {
        const next = new Set(prev);
        if (res.joined) next.add(slug);
        else next.delete(slug);
        return next;
      });
      if (data) {
        setData({
          ...data,
          recommended_communities: data.recommended_communities.map((c) =>
            c.slug === slug ? { ...c, is_member: res.joined, member_count: res.member_count } : c
          ),
        });
      }
      toast.success(
        res.joined ? t("community.explore.joinedSuccess") : t("community.explore.leftSuccess")
      );
    } catch {
      toast.error(t("common.operationFailed"));
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
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("community.explore.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("community.explore.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── 热门标签云 ── */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <div className="relative">
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            {t("community.explore.hotTags")}
          </h2>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(data?.trending_tags ?? []).map((tag, i) => (
                <button
                  key={tag.name}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105 hover:shadow-md border ${
                    i === 0
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-orange-200 dark:shadow-orange-900/30"
                      : i <= 2
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                      : "bg-secondary/50 text-foreground border-border hover:bg-secondary hover:border-primary/30"
                  }`}
                  onClick={() => {
                    // Navigate to community page filtered by tag
                    window.location.href = `/community?tag=${encodeURIComponent(tag.name)}`;
                  }}
                >
                  <Hash className="w-3 h-3" />
                  {tag.name}
                  <span className="text-xs opacity-70 ml-0.5">·{tag.count}</span>
                </button>
              ))}
              {(data?.trending_tags ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("community.home.hotTags.empty")}</p>
              )}
            </div>
          )}
        </section>

        {/* ── 推荐社群 ── */}
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              {t("community.explore.recommendedCommunities")}
            </h2>
            <Link
              href="/community/greenhouse"
              className="text-xs text-primary hover:underline"
            >
              {t("community.search.viewMore")}
            </Link>
          </div>
          {loading ? (
            <SectionSkeleton rows={3} />
          ) : (data?.recommended_communities ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t("community.explore.noRecommendedCommunities")}</p>
          ) : (
            <div className="space-y-3">
              {data!.recommended_communities.map((community) => (
                <div
                  key={community.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
                    {community.icon || "🌿"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/community/greenhouse/${community.slug}`}
                        className="font-medium text-sm hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {community.name}
                      </Link>
                      {community.is_official && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {community.member_count} {t("community.greenhouse.common.members")}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {community.post_count} {t("community.greenhouse.common.dreams")}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={community.is_member ? "outline" : "default"}
                    className={`text-xs h-8 px-3 flex-shrink-0 ${
                      community.is_member
                        ? "border-emerald-500/50 text-emerald-600"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white"
                    }`}
                    onClick={() => handleJoin(community.slug)}
                  >
                    {community.is_member ? t("community.greenhouse.common.joined") : t("community.greenhouse.common.join")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 活跃解梦者 ── */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <Crown className="h-4 w-4 text-violet-500" />
            {t("community.explore.activeInterpreters")}
          </h2>
          {loading ? (
            <SectionSkeleton rows={4} />
          ) : (data?.active_interpreters ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t("community.explore.noData")}</p>
          ) : (
            <div className="space-y-2">
              {data!.active_interpreters.map((u, i) => (
                <Link
                  key={u.id}
                  href={`/community/users/${u.id}`}
                  className="group flex items-center justify-between hover:bg-violet-500/5 rounded-lg px-3 py-2.5 transition-all border border-transparent hover:border-violet-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold ${
                      i === 0 ? "from-violet-400 to-purple-500" :
                      i === 1 ? "from-blue-400 to-cyan-500" :
                      "from-emerald-400 to-green-500"
                    }`}>
                      {u.username?.slice(0, 1) ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-violet-500 transition-colors">{u.username ?? t("community.home.anonymous")}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserPlus className="h-3 w-3" />
                        Lv{u.dreamer_level} {t("community.explore.interpreter")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-violet-500 font-semibold">
                    {u.interpretation_count} {t("community.explore.interpretationTimes")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}