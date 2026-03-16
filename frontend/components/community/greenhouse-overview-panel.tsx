"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Globe,
  Plus,
  Users,
} from "lucide-react";

import { communityAPI, type CommunityOverviewResponse } from "@/lib/community-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface GreenhouseOverviewPanelProps {
  slug: string;
}

export function GreenhouseOverviewPanel({ slug }: GreenhouseOverviewPanelProps) {
  const [overview, setOverview] = useState<CommunityOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    communityAPI.getGreenhouseOverview(slug)
      .then((res) => setOverview(res))
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const createdAtLabel = useMemo(() => {
    const createdAt = overview?.community?.created_at;
    if (!createdAt) return null;
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return null;

    const lang = i18n.language || "en";
    const locale =
      lang.startsWith("zh") ? "cn" :
      lang.startsWith("ja") ? "ja-JP" :
      "en-US";

    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [overview?.community?.created_at, i18n.language]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="bg-card border border-dashed border-border rounded-2xl p-4 text-sm text-muted-foreground">
        {t("community.greenhouse.overview.empty")}
      </div>
    );
  }

  const { community } = overview;

  const handleCreatePostLink = `/dreams/new?privacy=PUBLIC&share=1&communityId=${community.id}`;

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await communityAPI.joinCommunity(slug);
      setOverview((prev) => prev ? {
        ...prev,
        community: { ...prev.community, is_member: res.joined, member_count: res.member_count },
      } : prev);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-4 sticky top-6">
      <div className="px-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate">{community.name}</h3>
          </div>
          {community.is_official && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("community.greenhouse.overview.officialBadge")}
            </span>
          )}
        </div>
        {community.description && (
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {community.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl px-3 py-2">
          <p className="text-muted-foreground">
            {t("community.greenhouse.overview.members")}
          </p>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1 mt-1">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            {community.member_count.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl px-3 py-2">
          <p className="text-muted-foreground">
            {t("community.greenhouse.overview.posts")}
          </p>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1 mt-1">
            <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
            {community.post_count.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={community.is_member ? "outline" : "default"}
          className="w-full gap-2 border-emerald-500/40 text-emerald-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(16,185,129,0.6)] hover:bg-emerald-500/15 hover:text-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
          onClick={handleJoin}
          disabled={joining}
        >
          <Plus className="h-4 w-4" />
          {community.is_member
            ? t("community.greenhouse.overview.joined")
            : t("community.greenhouse.overview.join")}
        </Button>
        <Link href={handleCreatePostLink}>
          <Button className="w-full gap-2 bg-emerald-600 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_10px_24px_-14px_rgba(16,185,129,0.7)]">
            <Plus className="h-4 w-4" />
            {t("community.greenhouse.overview.createPost")}
          </Button>
        </Link>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        {createdAtLabel && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              {t("community.greenhouse.overview.createdAt", {
                date: createdAtLabel,
              })}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-emerald-500" />
          <span>{t("community.greenhouse.overview.public")}</span>
        </div>
      </div>
    </div>
  );
}
